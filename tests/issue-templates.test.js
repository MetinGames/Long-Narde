import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const root = path.resolve('./');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function parseYaml(relativePath) {
    return YAML.parse(read(relativePath));
}

function assertNonEmptyString(value, message) {
    assert.equal(typeof value, 'string', message);
    assert.ok(value.trim().length > 0, message);
}

function validateIssueForm(form, formName) {
    assert.ok(form && typeof form === 'object', `${formName}: must be an object`);

    assertNonEmptyString(form.name, `${formName}: top-level name is required`);
    assertNonEmptyString(form.description, `${formName}: top-level description is required`);
    assertNonEmptyString(form.title, `${formName}: top-level title is required`);

    const labelsType = typeof form.labels;
    const labelsIsValid = labelsType === 'string' || Array.isArray(form.labels);
    assert.ok(labelsIsValid, `${formName}: top-level labels must be a string or array`);

    if (Array.isArray(form.labels)) {
        assert.ok(form.labels.length > 0, `${formName}: labels array must not be empty`);
        for (const label of form.labels) {
            assertNonEmptyString(label, `${formName}: labels entries must be non-empty strings`);
        }
    } else {
        assertNonEmptyString(form.labels, `${formName}: labels string must be non-empty`);
    }

    assert.ok(Array.isArray(form.body), `${formName}: top-level body must be an array`);
    assert.ok(form.body.length > 0, `${formName}: body must not be empty`);

    const allowedTypes = new Set(['markdown', 'input', 'textarea', 'dropdown', 'checkboxes']);
    const ids = new Set();

    for (const [index, item] of form.body.entries()) {
        assert.ok(item && typeof item === 'object', `${formName}: body[${index}] must be an object`);
        assertNonEmptyString(item.type, `${formName}: body[${index}].type is required`);
        assert.ok(allowedTypes.has(item.type), `${formName}: body[${index}] has unsupported type '${item.type}'`);

        assert.ok(item.attributes && typeof item.attributes === 'object', `${formName}: body[${index}].attributes must exist`);

        if (item.type === 'markdown') {
            assert.equal(item.id, undefined, `${formName}: markdown items must not define id`);
            assertNonEmptyString(item.attributes.value, `${formName}: markdown items require attributes.value`);
            continue;
        }

        assertNonEmptyString(item.id, `${formName}: body[${index}].id is required for type '${item.type}'`);
        assert.match(item.id, /^[A-Za-z][A-Za-z0-9_-]*$/, `${formName}: invalid id '${item.id}'`);
        assert.ok(!ids.has(item.id), `${formName}: duplicate id '${item.id}'`);
        ids.add(item.id);

        assertNonEmptyString(item.attributes.label, `${formName}: body[${index}].attributes.label is required`);

        if (item.validations !== undefined) {
            assert.ok(item.validations && typeof item.validations === 'object', `${formName}: body[${index}].validations must be an object`);
            if (Object.prototype.hasOwnProperty.call(item.validations, 'required')) {
                assert.equal(typeof item.validations.required, 'boolean', `${formName}: body[${index}].validations.required must be boolean`);
            }
        }

        if (item.type === 'dropdown') {
            assert.ok(Array.isArray(item.attributes.options), `${formName}: dropdown '${item.id}' must define attributes.options array`);
            assert.ok(item.attributes.options.length > 0, `${formName}: dropdown '${item.id}' options must not be empty`);
            for (const option of item.attributes.options) {
                assertNonEmptyString(option, `${formName}: dropdown '${item.id}' options must be non-empty strings`);
            }
        }

        if (item.type === 'checkboxes') {
            assert.ok(Array.isArray(item.attributes.options), `${formName}: checkboxes '${item.id}' must define attributes.options array`);
            assert.ok(item.attributes.options.length > 0, `${formName}: checkboxes '${item.id}' options must not be empty`);

            for (const [optionIndex, option] of item.attributes.options.entries()) {
                assert.ok(option && typeof option === 'object', `${formName}: checkboxes '${item.id}' option[${optionIndex}] must be an object`);
                assertNonEmptyString(option.label, `${formName}: checkboxes '${item.id}' option[${optionIndex}].label is required`);
                if (Object.prototype.hasOwnProperty.call(option, 'required')) {
                    assert.equal(typeof option.required, 'boolean', `${formName}: checkboxes '${item.id}' option[${optionIndex}].required must be boolean`);
                }
            }
        }
    }
}

test('GitHub issue forms parse and match GitHub Issue Forms schema basics', () => {
    const bug = parseYaml('.github/ISSUE_TEMPLATE/bug_report.yml');
    const feature = parseYaml('.github/ISSUE_TEMPLATE/feature_request.yml');

    validateIssueForm(bug, 'bug_report.yml');
    validateIssueForm(feature, 'feature_request.yml');
});

test('issue form config is safe and routes to the live game plus forms', () => {
    const config = read('.github/ISSUE_TEMPLATE/config.yml');

    assert.ok(config.includes('blank_issues_enabled: false'));
    assert.ok(config.includes('https://metingames.github.io/Long-Narde/'));
    assert.ok(config.includes('https://github.com/MetinGames/Long-Narde/issues/new?template=bug_report.yml'));
    assert.ok(config.includes('https://github.com/MetinGames/Long-Narde/issues/new?template=feature_request.yml'));
});
