import { ByteReader } from "../file/ByteReader";
import { CpuMeasurement, ProfilerFile, FileError, MemoryOperation } from "../file/ProfilerFile";

// https://developer.roku.com/en-gb/docs/developer-program/dev-tools/brs-profiler-file-format.md#body
export function parseBody(file: ProfilerFile, reader: ByteReader) {
    const handlerMap: Record<EntryTag, EntryHandler | null> = {
        [EntryTag.STRING_TABLE]: handleStringTableEntry,
        [EntryTag.EXECUTABLE_MODULE]: handleExecutableModuleEntry,
        [EntryTag.PATH_ELEMENT]: handlePathElementEntry,
        [EntryTag.MEMORY_OPERATION]: handleMemoryOperationEntry,
        [EntryTag.CPU_MEASUREMENT]: handleCpuMeasurementEntry,
        [EntryTag.PATH_CALL_COUNT]: handlePathCallCountEntry,
    }

    while (reader.hasBytesToRead()) {
        const entry = reader.readUInt64();
        if (!entry) break;

        const entryTag: EntryTag = Number(entry) & 0x7; // 3 least-significant bits
        const handler = handlerMap[entryTag];
        if (handler != null) {
            handler(file, reader, entry);
        }
        else {
            file.error = FileError.UNKNOWN_BODY_ENTRY;
            throw `Unknown entry '${entryTag.toString(2)}' found at byte ${reader.index.toString()}`;
        }
    }
}

export enum EntryTag {
    STRING_TABLE = 0x0, // 000
    EXECUTABLE_MODULE = 0x1, // 001
    PATH_ELEMENT = 0x2, // 010
    MEMORY_OPERATION = 0x3, // 011
    CPU_MEASUREMENT = 0x4, // 100
    PATH_CALL_COUNT = 0x5, // 101
}

export type EntryHandler = (file: ProfilerFile, reader: ByteReader, tag: bigint) => void;

function handleStringTableEntry(file: ProfilerFile, reader: ByteReader, tag: bigint) {
    const id = Number(tag >> 3n);
    if (id === 0) return;
    file.body.stringTable[id] = reader.readString();
}

function handleExecutableModuleEntry(file: ProfilerFile, reader: ByteReader, tag: bigint) {
    const id = Number(tag >> 3n);
    if (id === 0) return;
    file.body.executableModules[id] = reader.readUInt32();
}

function handlePathElementEntry(file: ProfilerFile, reader: ByteReader, tag: bigint) {
    const id = Number(tag >> 3n);
    const el = file.getPathElement(id);

    const callerId = reader.readUInt32();
    if (callerId == 0) {
        el.props = {
            moduleId: reader.readUInt32(),
            callerId: undefined,
            lineOffsetInCaller: undefined,
            fileNameStringId: reader.readUInt32(),
            lineNumber: reader.readUInt32(),
            functionNameStringId: reader.readUInt32(),
        };
    }
    else {
        el.props = {
            moduleId: undefined,
            callerId: callerId,
            lineOffsetInCaller: file.header.lineSpecificData ? reader.readUInt32() : 0,
            fileNameStringId: reader.readUInt32(),
            lineNumber: reader.readUInt32(),
            functionNameStringId: reader.readUInt32(),
        };
        file.assignToParentPathElement(el);
    }
}

function handleMemoryOperationEntry(file: ProfilerFile, reader: ByteReader, tag: bigint) {
    const id = Number(tag >> 5n);
    const op = Number(tag >> 3n) & 0x3;

    const memoryOp: MemoryOperation = {
        opIndex: -1,
        opType: op,
        lineOffset: file.header.lineSpecificData ? reader.readUInt32() : 0,
        memAddress: reader.readUInt32(),
        allocSize: op == 0 ? reader.readUInt32() : undefined,
    };
    file.addMemoryOperation(id, memoryOp);
}

function handleCpuMeasurementEntry(file: ProfilerFile, reader: ByteReader, tag: bigint) {
    const id = Number(tag >> 3n);
    const cpuMeasurement: CpuMeasurement = {
        opIndex: -1,
        lineOffset: file.header.lineSpecificData ? reader.readUInt32() : 0,
        selfCpu: reader.readUInt32(),
        selfTime: reader.readUInt32(),
    };
    file.addCpuMeasurement(id, cpuMeasurement);
}

function handlePathCallCountEntry(file: ProfilerFile, reader: ByteReader, tag: bigint) {
    const id = Number(tag >> 3n);
    const callCount = reader.readUInt32();
    file.addCallCountEntry(id, callCount);
}
