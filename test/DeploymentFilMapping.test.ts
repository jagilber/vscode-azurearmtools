// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:no-unused-expression max-func-body-length promise-function-async max-line-length insecure-random
// tslint:disable:object-literal-key-quotes no-function-expression no-non-null-assertion align no-http-string

import * as assert from 'assert';
import * as path from 'path';
import { Uri } from "vscode";
import { DeploymentFileMapping, isWin32 } from "../extension.bundle";
import { TestConfiguration } from "./support/TestConfiguration";
import { testOnWin32 } from './support/testOnPlatform';

suite("DeploymentFileMapping", () => {
    const param1 = Uri.file(isWin32 ? "c:\\temp\\template1.params.json" : "/temp/template1.params.json");
    const param1variation = Uri.file(isWin32 ? "c:\\temp\\abc\\..\\template1.params.json" : "/temp/abc/../template1.params.json");

    const param1subfolder = Uri.file(isWin32 ? "c:\\temp\\sub\\template1.params.json" : "/temp/sub/template1.params.json");
    const param1parentfolder = Uri.file(isWin32 ? "c:\\template1.params.json" : "/template1.params.json");

    const template1 = Uri.parse(isWin32 ? "c:\\temp\\template1.json" : "/temp/template1.json");
    const template1variation = Uri.parse(isWin32 ? "c:\\temp\\abc\\..\\template1.json" : "/temp/abc/../template1.json");

    test("Update/get", async () => {
        const testConfig = new TestConfiguration();
        const mapping = new DeploymentFileMapping(testConfig);
        const t = template1;
        const p = param1;

        await mapping.mapParameterFile(t, p);

        assert.equal(mapping.getParameterFile(t)?.fsPath, p.fsPath);
        assert.equal(mapping.getTemplateFile(p)?.fsPath, t.fsPath);
    });

    test("Update/get - paths normalized", async () => {
        const testConfig = new TestConfiguration();
        const mapping = new DeploymentFileMapping(testConfig);
        const t = template1variation;
        const p = param1variation;

        await mapping.mapParameterFile(t, p);

        assert.equal(mapping.getParameterFile(t)?.fsPath, path.resolve(p.fsPath));
        assert.equal(mapping.getTemplateFile(p)?.fsPath, path.resolve(t.fsPath));
    });

    test("Update/get - param in subfolder", async () => {
        const testConfig = new TestConfiguration();
        const mapping = new DeploymentFileMapping(testConfig);
        const t = template1;
        const p = param1subfolder;

        await mapping.mapParameterFile(t, p);

        assert.equal(mapping.getParameterFile(t)?.fsPath, p.fsPath);
        assert.equal(mapping.getTemplateFile(p)?.fsPath, t.fsPath);
    });

    test("Update/get - param in parent folder", async () => {
        const testConfig = new TestConfiguration();
        const mapping = new DeploymentFileMapping(testConfig);
        const t = template1;
        const p = param1parentfolder;

        await mapping.mapParameterFile(t, p);

        assert.equal(mapping.getParameterFile(t)?.fsPath, p.fsPath);
        assert.equal(mapping.getTemplateFile(p)?.fsPath, t.fsPath);
    });

    testOnWin32("Update/get - param on different drive", async () => {
        const testConfig = new TestConfiguration();
        const mapping = new DeploymentFileMapping(testConfig);
        const t = Uri.file("c:\\temp\\template1.params.json");
        const p = Uri.file("d:\\temp\\template1.params.json");

        await mapping.mapParameterFile(t, p);

        assert.equal(mapping.getParameterFile(t)?.fsPath, p.fsPath);
        assert.equal(mapping.getTemplateFile(p)?.fsPath, t.fsPath);
    });

    test("Param paths are stored in settings relative to template folder", async () => {
        const testConfig = new TestConfiguration();
        const mapping = new DeploymentFileMapping(testConfig);
        const t = template1;
        const p = param1subfolder;

        await mapping.mapParameterFile(t, p);

        const parameterFiles = <{ [key: string]: string }>testConfig.get("parameterFiles");
        const pStoredPath = parameterFiles[t.fsPath];
        assert(!path.isAbsolute(pStoredPath));
    });
});
