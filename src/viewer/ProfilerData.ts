import { resolve } from "path";
import { readFileSync } from "fs";
import { CpuMeasurement, MemoryOperation, ModuleId, PathElement, PathElementId, ProfilerBody, ProfilerFile } from "../file/ProfilerFile";

const anonMatcher = /^\$anon/i;
const methodMatcher = /(?:([\w_]+)(?::\s*|\s*=\s*))(?:sub|function)\(/i;
const notAllowedMatcher = /^pkg:\/(libsource)/i;
const fileCache = new Map<string, string[]>();

export type ModuleData = {
    name: string;
    fns: PathData[];
};

export type MeasurementData = {
    selfCpu: number;
    selfTime: number;
    callablesCpu: number;
    callablesTime: number;
    totalCpu: number;
    totalTime: number;
}

export type PathData = MeasurementData & {
    module: ModuleId | undefined;
    parent: PathElementId | undefined;
    name: string;
    file: string;
    line: number;
    fns?: PathData[];
    calls: number;
}

export class ProfilerData {
    public readonly modules: { [id: ModuleId]: ModuleData } = {};
    public readonly paths: { [id: PathElementId]: PathData } = {};
    public readonly orphans: PathData[] = [];

    public constructor(
        public readonly file: ProfilerFile
    ) {
        this.fillModuleData();
        this.fillFnData();
    }

    private fillModuleData() {
        const bodyCache = this.file.body;
        for (const module in bodyCache.executableModules) {
            this.modules[module] = {
                name: bodyCache.stringTable[bodyCache.executableModules[module]],
                fns: [],
            };
        }
    }

    private fillFnData() {
        const bodyCache = this.file.body;
        const pathCache = this.paths;
        for (const pathElementId in bodyCache.pathElements) {
            const pathElement = bodyCache.pathElements[pathElementId];
            if (!pathElement.props) continue;

            const pathData: PathData = this.generatePathData(bodyCache, pathElement);
            pathCache[pathElementId] = pathData;

            if (anonMatcher.test(pathData.name)) {
                pathData.name = this.resolveAnonFn(pathData.name, pathData.file, pathData.line);
            }

            if (pathData.parent) {
                const parent = pathCache[pathData.parent];
                if (!parent.fns) parent.fns = [];
                parent.fns.push(pathData);
                this.sumMeasurements(pathData, parent, pathCache);
            }
            else if (pathElement.props.moduleId) {
                this.modules[pathElement.props.moduleId].fns.push(pathData);
            }
            else {
                this.orphans.push(pathData);
            }
        }
    }

    private generatePathData(bodyCache: ProfilerBody, pathElement: PathElement): PathData {
        const calls = pathElement.callCounts.reduce((a, b) => a + b, 0);
        const selfCpu = pathElement.cpuMeasurements.reduce((a, b) => a + b.selfCpu, 0);
        const selfTime = pathElement.cpuMeasurements.reduce((a, b) => a + b.selfTime, 0);
        return {
            module: pathElement.props!.moduleId,
            parent: pathElement.props!.callerId,
            file: `${bodyCache.stringTable[pathElement.props!.fileNameStringId]}`,
            line: pathElement.props!.lineNumber,
            name: bodyCache.stringTable[pathElement.props!.functionNameStringId],
            calls: calls,
            selfCpu: selfCpu,
            selfTime: selfTime,
            callablesCpu: 0,
            callablesTime: 0,
            totalCpu: selfCpu,
            totalTime: selfTime,
        };
    }

    private sumMeasurements(pathData: PathData, parentData: PathData, pathCache: Record<number, PathData>) {
        while (parentData) {
            parentData.callablesCpu += pathData.selfCpu;
            parentData.callablesTime += pathData.selfTime;
            parentData.totalCpu += pathData.selfCpu;
            parentData.totalTime += pathData.selfTime;
            if (!parentData.parent) break;
            parentData = pathCache[parentData.parent] ?? null;
        }
    }

    private resolveAnonFn(anonName: string, file: string, line: number): string {
        if (!notAllowedMatcher.test(file)) {
            const fileContents = fileCache.get(file) ?? (() => {
                const contents = readFileSync(resolve(`../gst-apps-roku-client/build/${file.replace('pkg:/', '')}`), "utf8");
                const lines = contents.split("\n");
                fileCache.set(file, lines);
                return lines;
            })();
            if (fileContents) {
                line--;
                while (line >= 0) {
                    const str = fileContents[line];
                    const match = str.match(methodMatcher);
                    if (match) return match[1] ?? anonName;
                    line--;
                }
            }
        }
        return anonName;
    }
}
