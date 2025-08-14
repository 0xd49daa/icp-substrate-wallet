import { execSync } from 'child_process';
import * as path from 'path';

function pretest(): void {
    execSync(`dfx canister uninstall-code signing_full || true`, {
        stdio: 'inherit', cwd: path.resolve(__dirname, '../..')
    });

    execSync(`dfx deploy signing_full`, {
        stdio: 'inherit', cwd: path.resolve(__dirname, '../..')
    });

    execSync(`dfx generate signing_full`, {
        stdio: 'inherit', cwd: path.resolve(__dirname, '../..')
    });
}

pretest();
