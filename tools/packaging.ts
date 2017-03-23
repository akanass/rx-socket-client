// import libraries
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/mergeMap';
import * as fs from 'fs-extra';

/**
 * Interface for file object definition
 */
interface fileObject {
    name: string;
    remove?: boolean;
}

/**
 * Class declaration
 */
class Packaging {
    // private property to store files list
    private _files: fileObject[];
    // private property to store src path
    private _srcPath: string;
    // private property to store dest path
    private _destPath: string;

    /**
     * Class constructor
     *
     * @param files {fileObject[]} name of each files to package and flag to know if we need to delete it after
     * @param src {string} src base path from current process
     * @param dest {string} dest base path from current process
     */
    constructor(files: fileObject[], src: string = '', dest: string = '/dist') {
        this._files = files;
        this._srcPath = `${process.cwd()}${src}/`;
        this._destPath = `${process.cwd()}${dest}/`;
    }

    /**
     * Function to copy one file
     *
     * @param file {string}
     *
     * @return {Observable<R>}
     */
    private _copy(file: string): Observable<any> {
        // copy package.json
        if (file.indexOf('package.json') != -1) {
            return this._copyAndCleanupPackageJson(file);
        }

        // copy other files
        return <Observable<any>> Observable.create((observer) => {
            fs.copy(`${this._srcPath}${file}`, `${this._destPath}${file}`, (error) => {
                if (error) {
                    return observer.error(error);
                }

                observer.next();
                observer.complete();
            });
        });
    }

    /**
     * Function to remove original file
     *
     * @param file {string}
     * @param remove {boolean}
     *
     * @return {Observable<any>}
     *
     * @private
     */
    private _remove(file: string, remove?:boolean): Observable<any> {
        // remove original files
        return <Observable<any>> Observable.create((observer) => {
            if (remove) {
                fs.remove(`${this._srcPath}${file}`, (error) => {
                    if (error) {
                        return observer.error(error);
                    }

                    observer.next();
                    observer.complete();
                });
            }
            else {
                observer.next();
                observer.complete();
            }
        });
    }

    /**
     * Function to cleanup package.json and _copy it to dist directory
     *
     * @param file {string}
     *
     * @return {Observable<R>}
     *
     * @private
     */
    private _copyAndCleanupPackageJson(file: string): Observable<any> {
        // function to read JSON
        const readJson = (src: string): Observable<any> => {
            return <Observable<any>> Observable.create((observer) => {
                fs.readJson(src, (error, packageObj) => {
                    if (error) {
                        return observer.error(error);
                    }

                    observer.next(packageObj);
                    observer.complete();
                });
            });
        };

        // function to write JSON
        const writeJson = (dest: string, data: any): Observable<any> => {
            return <Observable<any>> Observable.create((observer) => {
                fs.outputJson(dest, data, (error) => {
                    if (error) {
                        return observer.error(error);
                    }

                    observer.next();
                    observer.complete();
                });
            });
        };

        // read package.json
        return readJson(`${this._srcPath}${file}`).flatMap(packageObj => {
            // delete obsolete data in package.json
            delete packageObj.scripts;
            delete packageObj.devDependencies;

            // write new package.json
            return writeJson(`${this._destPath}${file}`, packageObj);
        });
    }

    /**
     * Function that _copy all files in dist directory
     */
    process() {
        Observable.forkJoin(this._files.map((fileObject: fileObject) => this._copy(fileObject.name).flatMap(_ => this._remove(fileObject.name, fileObject.remove)))).subscribe(null, error => console.error(error));
    }
}

// process packaging
new Packaging(require('./files')).process();