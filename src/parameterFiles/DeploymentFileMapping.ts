// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { ConfigurationTarget, Uri } from 'vscode';
import { IConfiguration } from '../Configuration';
import { configKeys } from '../constants';
import { normalizePath } from '../util/normalizePath';
import { getRelativeParameterFilePath, resolveParameterFilePath } from './parameterFiles';

export class DeploymentFileMapping {
    public constructor(private configuration: IConfiguration) { }

    /**
     * Given a template file, find the parameter file, if any, that the user currently has associated with it
     */
    public getParameterFile(templateFileUri: Uri): Uri | undefined {
        const paramFiles: { [key: string]: string } | undefined =
            this.configuration.get<{ [key: string]: string }>(configKeys.parameterFiles)
            // tslint:disable-next-line: strict-boolean-expressions
            || {};
        if (typeof paramFiles === 'object') {
            const normalizedTemplatePath = normalizePath(templateFileUri.fsPath);
            let paramFile: Uri | undefined;

            // Can't do a simple lookup because need to be case-insensitivity tolerant on Win32
            for (let templatePathKey of Object.getOwnPropertyNames(paramFiles)) {
                const normalizedFileName: string | undefined = normalizePath(templatePathKey);
                if (normalizedFileName === normalizedTemplatePath) {
                    if (typeof paramFiles[templatePathKey] === 'string') {
                        // Resolve relative to template file's folder
                        let resolvedPath = resolveParameterFilePath(templateFileUri.fsPath, paramFiles[templatePathKey]);

                        // If the user has an entry in both workspace and user settings, vscode combines the two objects,
                        //   with workspace settings overriding the user settings.
                        // If there are two entries differing only by case, allow the last one to win, because it will be
                        //   the workspace setting value
                        paramFile = !!resolvedPath ? Uri.file(resolvedPath) : undefined;
                    }
                }
            }

            return paramFile;
        }

        return undefined;
    }

    //asdf
    public getTemplateFile(parameterFileUri: Uri): Uri | undefined {
        const paramFiles: { [key: string]: string } | undefined =
            this.configuration.get<{ [key: string]: string }>(configKeys.parameterFiles)
            // tslint:disable-next-line: strict-boolean-expressions
            || {};
        if (typeof paramFiles === 'object') {
            const normalizedTargetParamPath = normalizePath(parameterFileUri.fsPath);
            let templateFile: Uri | undefined;

            // Can't do a simple lookup because need to be case-insensitivity tolerant on Win32
            for (let templatePathKey of Object.getOwnPropertyNames(paramFiles)) {
                const paramFileRelativePath = paramFiles[templatePathKey]; // asdf can this be undefined?
                if (typeof paramFileRelativePath !== "string") {
                    continue;
                }

                // Resolve relative to template file's folder
                let resolvedPath = resolveParameterFilePath(templatePathKey, paramFileRelativePath);
                const normalizedParamPath: string = normalizePath(resolvedPath);

                // If the user has an entry in both workspace and user settings, vscode combines the two objects,
                //   with workspace settings overriding the user settings.
                // If there are two entries differing only by case, allow the last one to win, because it will be
                //   the workspace setting value

                if (normalizedParamPath === normalizedTargetParamPath) {
                    templateFile = !!templatePathKey ? Uri.file(templatePathKey) : undefined;
                }
            }

            return templateFile;
        }

        return undefined;
    }

    /**
     * Sets a mapping from a template file to a parameter file
     */
    public async mapParameterFile(templateUri: Uri, paramFileUri: Uri | undefined): Promise<void> {
        const relativeParamFilePath: string | undefined = paramFileUri ? getRelativeParameterFilePath(templateUri, paramFileUri) : undefined;
        const normalizedTemplatePath = normalizePath(templateUri.fsPath);

        // We only want the values in the user settings
        let map = this.configuration
            .inspect<{ [key: string]: string | undefined }>(configKeys.parameterFiles)?.globalValue
            // tslint:disable-next-line: strict-boolean-expressions
            || {};

        if (typeof map !== 'object') {
            map = {};
        }

        // Copy existing entries that don't match (might be multiple entries with different casing, so can't do simple delete) //asdftestpoint
        const newMap: { [key: string]: string | undefined } = {};

        for (let templatePath of Object.getOwnPropertyNames(map)) {//asdftestpoint
            if (normalizePath(templatePath) !== normalizedTemplatePath) {//asdftestpoint
                newMap[templatePath] = map[templatePath]; //asdftestpoint
            }
        }

        // Add new entry
        if (paramFileUri) {
            newMap[normalizedTemplatePath] = relativeParamFilePath;
        }

        await this.configuration.update(configKeys.parameterFiles, newMap, ConfigurationTarget.Global);
    }
}
