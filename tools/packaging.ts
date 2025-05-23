// import libraries
import { forkJoin, mergeMap, Observable } from 'rxjs';
import * as fs from 'fs-extra';

/**
 * Interface for file object definition
 */
interface FileObject {
  name: string;
}

/**
 * Class declaration
 */
class Packaging {
  // private property to store files list
  private _files: FileObject[];
  // private property to store src path
  private readonly _srcPath: string;
  // private property to store dest path
  private readonly _destPath: string;

  /**
   * Class constructor
   *
   * @param files {FileObject[]} name of each files to package and flag to know if we need to delete it after
   * @param src {string} src base path from current process
   * @param dest {string} dest base path from current process
   */
  constructor(files: FileObject[], src: string = '', dest: string = '/dist') {
    this._files = files;
    this._srcPath = `${process.cwd()}${src}/`;
    this._destPath = `${process.cwd()}${dest}/`;
  }

  /**
   * Function that _copy all files in dist directory
   */
  process() {
    forkJoin(
      this._files.map(
        (fileObject: FileObject) => this._copy(fileObject.name)
      )
    )
      .subscribe({
        error: (e) => console.error(e)
      });
  }

  /**
   * Function to copy one file
   *
   * @param file {string}
   *
   * @return {Observable<any>}
   */
  private _copy(file: string): Observable<any> {
    // copy package.json
    if (file.indexOf('package.json') !== -1) {
      return this._copyAndCleanupPackageJson(file);
    }

    // copy other files
    return <Observable<any>>new Observable((observer) => {
      fs.stat(`${this._srcPath}${file}`, (error, stats) => {
        if (error) {
          console.error('doesn\'t exist on copy =>', error.message);
        }
        if (stats && (stats.isFile() || stats.isDirectory())) {
          fs.copy(`${this._srcPath}${file}`, `${this._destPath}${file}`, (err) => {
            if (err) {
              console.error('copy failed =>', err.message);
            }

            // @ts-ignore
            observer.next();
            observer.complete();
          });
        } else {
          // @ts-ignore
          observer.next();
          observer.complete();
        }
      });
    });
  }

  /**
   * Function to cleanup package.json and _copy it to dist directory
   *
   * @param file {string}
   *
   * @return {Observable<any>}
   *
   * @private
   */
  private _copyAndCleanupPackageJson(file: string): Observable<any> {
    // function to read JSON
    const readJson = (src: string): Observable<any> => new Observable((observer) => {
      fs.readJson(src, (error, packageObj) => {
        if (error) {
          return observer.error(error);
        }

        observer.next(packageObj);
        observer.complete();
      });
    });

    // function to write JSON
    const writeJson = (dest: string, data: any): Observable<any> => Observable.create((observer) => {
      fs.outputJson(dest, data, (error) => {
        if (error) {
          return observer.error(error);
        }

        observer.next();
        observer.complete();
      });
    });

    // read package.json
    return readJson(`${this._srcPath}${file}`)
      .pipe(
        mergeMap(packageObj => {
          // delete obsolete data in package.json
          delete packageObj['scripts'];
          delete packageObj.devDependencies;

          // write new package.json
          return writeJson(`${this._destPath}${file}`, packageObj);
        })
      );
  }
}

// process packaging
new Packaging(require('./files')).process();
