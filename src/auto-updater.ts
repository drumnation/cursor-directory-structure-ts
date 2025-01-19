// auto_updater.ts
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { IncomingMessage } from 'http';
import * as unzipper from 'unzipper';
import { DateTime } from 'luxon';

function clearConsole(): void {
  if (os.platform() === 'win32') {
    process.stdout.write('\x1B[2J\x1B[0f');
  } else {
    process.stdout.write('\x1Bc');
  }
}

interface UpdateInfo {
  sha: string;
  message: string;
  date: string;
  author: string;
  download_url: string;
}

class AutoUpdater {
  private repoUrl: string;
  private apiUrl: string;

  constructor(repoUrl: string = 'https://github.com/RenjiYuusei/CursorFocus') {
    this.repoUrl = repoUrl;
    this.apiUrl = repoUrl.replace('github.com', 'api.github.com/repos');
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      let response = await this.fetchData(
        `${this.apiUrl}/commits/main`
      );
      if (!response) {
        response = await this.fetchData(
          `${this.apiUrl}/commits/master`
        );
      }

      if (!response) {
        return null;
      }

      const latestCommit = response;
      const currentCommit = this.getCurrentCommit();

      if (latestCommit.sha !== currentCommit) {
        const utcDate = DateTime.fromISO(latestCommit.commit.author.date, {
          zone: 'utc',
        });
        const localDate = utcDate.toLocal();
        const formattedDate = localDate.toFormat('MMMM dd, yyyy \'at\' h:mm a');

        return {
          sha: latestCommit.sha,
          message: latestCommit.commit.message,
          date: formattedDate,
          author: latestCommit.commit.author.name,
          download_url: `${this.repoUrl}/archive/refs/heads/main.zip`,
        };
      }

      return null;
    } catch (e) {
      console.error(`Error checking for updates: ${e}`);
      return null;
    }
  }

  private getCurrentCommit(): string {
    try {
      const versionFile = path.join(__dirname, '.current_commit');
      if (fs.existsSync(versionFile)) {
        return fs.readFileSync(versionFile, 'utf-8').trim();
      }
      return '';
    } catch {
      return '';
    }
  }

  async update(updateInfo: UpdateInfo): Promise<boolean> {
    try {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursorfocus-'));
      const zipPath = path.join(tempDir, 'update.zip');

      const file = fs.createWriteStream(zipPath);
      const response = await new Promise<IncomingMessage>(
        (resolve, reject) => {
          https
            .get(updateInfo.download_url, (res) => {
              if (res.statusCode !== 200) {
                reject(
                  new Error(`Request failed with status code ${res.statusCode}`)
                );
              } else {
                resolve(res);
              }
            })
            .on('error', reject);
        }
      );

      response.pipe(file);

      await new Promise<void>((resolve, reject) => {
        file.on('finish', () => resolve());
        file.on('error', reject);
      });

      const zip = fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: tempDir }));

      await new Promise<void>((resolve, reject) => {
        zip.on('close', () => resolve());
        zip.on('error', reject);
      });

      const extractedDir = fs.readdirSync(tempDir).find((name) => name !== 'update.zip');
      if (!extractedDir) {
        throw new Error('Could not find extracted directory');
      }

      const srcDir = path.join(tempDir, extractedDir);
      const dstDir = __dirname;

      this.copyRecursiveSync(srcDir, dstDir);

      fs.writeFileSync(path.join(dstDir, '.current_commit'), updateInfo.sha);

      fs.rmSync(tempDir, { recursive: true, force: true });

      clearConsole();
      return true;
    } catch (e) {
      console.error(`Error updating: ${e}`);
      return false;
    }
  }

  private copyRecursiveSync(src: string, dest: string): void {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats && stats.isDirectory();

    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
      }
      fs.readdirSync(src).forEach((childItemName) => {
        this.copyRecursiveSync(
          path.join(src, childItemName),
          path.join(dest, childItemName)
        );
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  private async fetchData(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      https
        .get(
          url,
          {
            headers: {
              'User-Agent': 'CursorFocus-Updater',
            },
          },
          (res) => {
            if (res.statusCode !== 200) {
              reject(
                new Error(`Request failed with status code ${res.statusCode}`)
              );
              return;
            }

            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });

            res.on('end', () => {
              resolve(JSON.parse(data));
            });
          }
        )
        .on('error', reject);
    });
  }
}

export { AutoUpdater, UpdateInfo };