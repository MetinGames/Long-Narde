import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = path.join(
    root,
    '.github',
    'workflows',
    'google-drive-archive.yml'
);
const workflow = fs.readFileSync(workflowPath, 'utf8');
const guide = fs.readFileSync(
    path.join(root, 'docs', 'GOOGLE_DRIVE_ARCHIVE.md'),
    'utf8'
);

test('Drive archive always retains a temporary GitHub recovery artifact', () => {
    const artifactIndex = workflow.indexOf('actions/upload-artifact@v4');
    const driveIndex = workflow.indexOf('Upload and verify archive in Google Drive');

    assert.ok(artifactIndex >= 0);
    assert.ok(driveIndex > artifactIndex);
    assert.match(workflow, /retention-days:\s*30/);
    assert.match(workflow, /\*\.zip[\s\S]*\*\.sha256[\s\S]*\*\.manifest\.json/);
});

test('Drive archive accepts OAuth or a Shared Drive service account', () => {
    assert.match(workflow, /secrets\.GDRIVE_RCLONE_CONFIG/);
    assert.match(workflow, /secrets\.GDRIVE_SERVICE_ACCOUNT_JSON/);
    assert.match(workflow, /vars\.DRIVE_SHARED_DRIVE_ID/);
    assert.match(workflow, /Google service accounts have no My Drive storage quota/);
    assert.match(workflow, /team_drive = \$DRIVE_SHARED_DRIVE_ID/);
    assert.doesNotMatch(workflow, /GDRIVE_CREDENTIALS:/);
});

test('Drive archive validates every durable file without logging credentials', () => {
    assert.match(workflow, /for FILE in "\$ARCHIVE" "\$ARCHIVE\.sha256" "\$MANIFEST"/);
    assert.match(workflow, /chmod 600 "\$CONFIG_PATH"/);
    assert.doesNotMatch(workflow, /echo "\$GDRIVE_(?:RCLONE_CONFIG|SERVICE_ACCOUNT_JSON)"/);
    assert.match(guide, /storageQuotaExceeded/);
    assert.match(guide, /Never\ncommit it, print it in logs/);
});
