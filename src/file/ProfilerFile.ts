export type Utf8z = string;
export type UInt8 = number;
export type UInt32 = number;
export type UInt64 = bigint;
export type Float32 = number;

export enum FileError {
    DEFAULT = 0,
    PARSE_ERROR,
    FILE_NOT_BSPROF,
    FILE_NOT_VALID,
    UNKNOWN_BODY_ENTRY,
}

export type StringId = UInt32;
export type ModuleId = UInt32;
export type PathElementId = UInt32;

export type PathElementProps = {
    moduleId?: ModuleId;
    callerId?: PathElementId;
    fileNameStringId: StringId;
    lineNumber: UInt32;
    lineOffsetInCaller?: UInt32;
    functionNameStringId: StringId;
};
export class PathElement {
    public props?: PathElementProps = undefined;
    public readonly memoryOperations: MemoryOperation[] = [];
    public readonly cpuMeasurements: CpuMeasurement[] = [];
    public readonly callCounts: UInt32[] = [];
    constructor(public id: PathElementId) { }
}

export type CpuMeasurement = {
    opIndex: number;
    lineOffset: UInt32;
    selfCpu: UInt32;
    selfTime: UInt32;
};
export enum MemoryOperationType {
    ALLOC = 0x0,
    FREE = 0x1,
    FREE_REALLOC = 0x2,
};
export type MemoryOperation = {
    opIndex: number;
    opType: MemoryOperationType;
    lineOffset: UInt32;
    memAddress: UInt32;
    allocSize?: UInt32;
};

export type ProfilerBody = {
    stringTable: Record<StringId, Utf8z>;
    executableModules: Record<ModuleId, StringId>;
    pathElements: Record<PathElementId, PathElement>;
};

export class ProfilerFile {
    public error = FileError.DEFAULT;
    public errorException: unknown = null;

    public header = {
        version: "",
        size: 0,
        requestedSampleRatio: 0,
        actualSampleRatio: 0,
        lineSpecificData: false,
        memoryOperations: false,
        targetRunStartTimestamp: 0n,
        targetName: "",
        supplementalInfo: "",
        targetVersion: "",
        deviceVendorName: "",
        deviceModelNumber: "",
        deviceFirmwareVersion: "",
    };

    public footer = {
        targetRunEndTimestamp: 0n,
    };

    public body: ProfilerBody = {
        stringTable: {},
        executableModules: {},
        pathElements: {},
    };

    private lastMemoryOperationIndex = 0;
    private lastCpuMeasurementIndex = 0;

    public getPathElement(id: PathElementId): PathElement {
        let el = this.body.pathElements[id];
        if (!el) {
            el = new PathElement(id);
            this.body.pathElements[id] = el;
        }
        return el;
    }

    public addMemoryOperation(id: PathElementId, op: MemoryOperation): PathElement {
        const el = this.getPathElement(id);
        op.opIndex = ++this.lastMemoryOperationIndex;
        el.memoryOperations.push(op);
        return el;
    }

    public addCpuMeasurement(id: PathElementId, op: CpuMeasurement): PathElement {
        const el = this.getPathElement(id);
        op.opIndex = ++this.lastCpuMeasurementIndex;
        el.cpuMeasurements.push(op);
        return el;
    }

    public addCallCountEntry(id: PathElementId, value: UInt32): PathElement {
        const el = this.getPathElement(id);
        el.callCounts.push(value);
        return el;
    }
}
