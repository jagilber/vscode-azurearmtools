// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { CachedPromise } from "../CachedPromise";
import { CachedValue } from "../CachedValue";
import { templateKeys } from "../constants";
import { DeploymentFile, DeploymentTemplate } from "../DeploymentTemplate";
import * as Json from "../JSON";
import * as language from "../Language";
import { isParametersSchema } from "../schemas";
import { nonNullOrEmptyValue } from "../util/nonNull";
import { ParametersPositionContext } from "./ParametersPositionContext";
import { ParameterValueDefinition } from "./ParameterValueDefinition";

export class DeploymentParameters extends DeploymentFile {
    // Parse result for the template JSON document as a whole
    private _jsonParseResult: Json.ParseResult;

    // The JSON node for the top-level JSON object (if the JSON is not empty or malformed)
    private _topLevelValue: Json.ObjectValue | undefined;

    // // A map from all JSON string value nodes to their cached TLE parse results asdf
    // private _jsonStringValueToTleParseResultMap: CachedValue<Map<Json.StringValue, TLE.ParseResult>> = new CachedValue<Map<Json.StringValue, TLE.ParseResult>>();

    // Cached errors and warnings in the template asdf
    private _errors: CachedPromise<language.Issue[]> = new CachedPromise<language.Issue[]>();
    private _warnings: CachedValue<language.Issue[]> = new CachedValue<language.Issue[]>();

    private _parameterValueDefinitions: CachedValue<ParameterValueDefinition[]> = new CachedValue<ParameterValueDefinition[]>();

    private _schema: CachedValue<Json.StringValue | undefined> = new CachedValue<Json.StringValue | undefined>();

    /**
     * Create a new DeploymentTemplate object. asdf
     *
     * @param _documentText The string text of the document.
     * @param _documentId A unique identifier for this document. Usually this will be a URI to the document.
     */
    constructor(private _documentText: string, private _documentId: string) {
        super();
        nonNullOrEmptyValue(_documentId, "_documentId");

        this._jsonParseResult = Json.parse(_documentText);
        this._topLevelValue = Json.asObjectValue(this._jsonParseResult.value);

        //asdf
        // this._topLevelScope = new TemplateScope(
        //     ScopeContext.TopLevel,
        //     this.getTopLevelParameterDefinitions(),
        //     'Top-level scope');
    }

    public get topLevelValue(): Json.ObjectValue | undefined {
        return this._topLevelValue;
    }

    public hasParametersUri(): boolean {
        return isParametersSchema(this.schemaUri);
    }

    /**
     * Get the document text as a string.
     */
    public get documentText(): string {
        return this._documentText;
    }

    /**
     * The unique identifier for this deployment template. Usually this will be a URI to the document.
     */
    public get documentId(): string {
        return this._documentId;
    }

    public get schemaUri(): string | undefined {
        const schema = this.schemaValue;
        return schema ? schema.unquotedValue : undefined;
    }

    public get schemaValue(): Json.StringValue | undefined {
        return this._schema.getOrCacheValue(() => {
            const value: Json.ObjectValue | undefined = Json.asObjectValue(this._jsonParseResult.value);
            if (value) {
                const schema: Json.StringValue | undefined = Json.asStringValue(value.getPropertyValue("$schema"));
                if (schema) {
                    return schema;
                }
            }

            return undefined;
        });
    }

    //asdf
    public get errorsPromise(): Promise<language.Issue[]> {
        return this._errors.getOrCachePromise(async () => {
            const parseErrors: language.Issue[] = [];
            return (parseErrors);
        });
    }

    //asdf
    public get warnings(): language.Issue[] {
        return this._warnings.getOrCacheValue(() => {
            // // tslint:disable-next-line: no-suspicious-comment
            // const unusedParams = this.findUnusedParameters();
            // const unusedVars = this.findUnusedVariables();
            // const unusedUserFuncs = this.findUnusedUserFunctions();
            // return unusedParams.concat(unusedVars).concat(unusedUserFuncs);
            return [];
        });
    }

    // CONSIDER: PERF: findUnused{Variables,Parameters,findUnusedNamespacesAndUserFunctions} are very inefficient}

    //asdf

    // private findUnusedParameters(): language.Issue[] {
    //     const warnings: language.Issue[] = [];

    //     // Top-level parameters
    //     for (const parameterDefinition of this.topLevelScope.parameterDefinitions) {
    //         const parameterReferences: ReferenceList =
    //             this.findReferences(parameterDefinition);
    //         if (parameterReferences.length === 1) {
    //             warnings.push(
    //                 new language.Issue(
    //                     parameterDefinition.nameValue.span,
    //                     `The parameter '${parameterDefinition.nameValue.toString()}' is never used.`,
    //                     language.IssueKind.unusedParam));
    //         }
    //     }

    //     return warnings;
    // }

    public getCommentCount(): number {
        return this.jsonParseResult.commentCount;
    }

    public getMultilineStringCount(): number {
        //asdf
        let count = 0;
        // this.visitAllReachableStringValues(jsonStringValue => {
        //     if (jsonStringValue.unquotedValue.indexOf("\n") >= 0) {
        //         ++count;
        //     }
        // });

        return count;
    }

    public get jsonParseResult(): Json.ParseResult {
        return this._jsonParseResult;
    }

    /**
     * Get the number of lines that are in the file.
     */
    public get lineCount(): number {
        return this._jsonParseResult.lineLengths.length;
    }

    /**
     * Get the maximum column index for the provided line. For the last line in the file,
     * the maximum column index is equal to the line length. For every other line in the file,
     * the maximum column index is less than the line length.
     */
    public getMaxColumnIndex(lineIndex: number): number {
        return this._jsonParseResult.getMaxColumnIndex(lineIndex);
    }

    /**
     * Get the maximum document character index for this deployment template.
     */
    public get maxCharacterIndex(): number {
        return this._jsonParseResult.maxCharacterIndex;
    }

    private getParameterValues(): ParameterValueDefinition[] {
        return this._parameterValueDefinitions.getOrCacheValue(() => {
            const parameterDefinitions: ParameterValueDefinition[] = [];

            if (this._topLevelValue) {
                const parameters: Json.ObjectValue | undefined = Json.asObjectValue(this._topLevelValue.getPropertyValue(templateKeys.parameters));
                if (parameters) {
                    for (const parameter of parameters.properties) {
                        parameterDefinitions.push(new ParameterValueDefinition(parameter));
                    }
                }
            }

            return parameterDefinitions;
        });
    }

    public getDocumentCharacterIndex(documentLineIndex: number, documentColumnIndex: number): number {
        return this._jsonParseResult.getCharacterIndex(documentLineIndex, documentColumnIndex);
    }

    public getDocumentPosition(documentCharacterIndex: number): language.Position {
        return this._jsonParseResult.getPositionFromCharacterIndex(documentCharacterIndex);
    }

    public getJSONTokenAtDocumentCharacterIndex(documentCharacterIndex: number): Json.Token | undefined {
        return this._jsonParseResult.getTokenAtCharacterIndex(documentCharacterIndex);
    }

    public getJSONValueAtDocumentCharacterIndex(documentCharacterIndex: number): Json.Value | undefined {
        return this._jsonParseResult.getValueAtCharacterIndex(documentCharacterIndex);
    }

    // CONSIDER: Move this to PositionContext since PositionContext depends on DeploymentTemplate
    public getContextFromDocumentLineAndColumnIndexes(documentLineIndex: number, documentColumnIndex: number, deploymentTemplate: DeploymentTemplate | undefined): ParametersPositionContext {
        return ParametersPositionContext.fromDocumentLineAndColumnIndexes(this, documentLineIndex, documentColumnIndex, deploymentTemplate);
    }

    // CONSIDER: Move this to PositionContext since PositionContext depends on DeploymentTemplate
    public getContextFromDocumentCharacterIndex(documentCharacterIndex: number, deploymentTemplate: DeploymentTemplate | undefined): ParametersPositionContext {
        return ParametersPositionContext.fromDocumentCharacterIndex(this, documentCharacterIndex, deploymentTemplate);
    }

    // /**
    //  * Get the TLE parse results from this JSON string.
    //  */
    // public getTLEParseResultFromJsonStringValue(jsonStringValue: Json.StringValue): TLE.ParseResult {
    //     const result = this.quotedStringToTleParseResultMap.get(jsonStringValue);
    //     if (result) {
    //         return result;
    //     }

    //     // This string must not be in the reachable Json.Value tree due to syntax or other issues which
    //     //   the language server should show in our diagnostics.
    //     // Go ahead and parse it now, pretending it has top-level scope
    //     const tleParseResult = TLE.Parser.parse(jsonStringValue.quotedValue, this.topLevelScope);
    //     this.quotedStringToTleParseResultMap.set(jsonStringValue, tleParseResult);
    //     return tleParseResult;
    // }

    //asdf
    // public findReferences(definition: INamedDefinition): ReferenceList {
    //     const result: ReferenceList = new ReferenceList(definition.definitionKind);
    //     const functions: FunctionsMetadata = AzureRMAssets.getFunctionsMetadata();

    //     // Add the definition of whatever's being referenced to the list
    //     if (definition.nameValue) {
    //         result.add(definition.nameValue.unquotedSpan);
    //     }

    //     // Find and add references that match the definition we're looking for
    //     this.visitAllReachableStringValues(jsonStringValue => {
    //         const tleParseResult: TLE.ParseResult | undefined = this.getTLEParseResultFromJsonStringValue(jsonStringValue);
    //         if (tleParseResult.expression) {
    //             // tslint:disable-next-line:no-non-null-assertion // Guaranteed by if
    //             const visitor = FindReferencesVisitor.visit(tleParseResult.expression, definition, functions);
    //             result.addAll(visitor.references.translate(jsonStringValue.span.startIndex));
    //         }
    //     });

    //     return result;
    // }
}
