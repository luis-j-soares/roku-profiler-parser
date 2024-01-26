import { ByteReader, isBytesEqual } from "../file/ByteReader";
import { ProfilerFile, FileError } from "../file/ProfilerFile";

const headerMagic = new Uint8Array([0x62, 0x73, 0x70, 0x72, 0x6f, 0x66, 0x00, 0x00]);

// https://developer.roku.com/en-gb/docs/developer-program/dev-tools/brs-profiler-file-format.md#header
export function parseHeader(file: ProfilerFile, reader: ByteReader) {
    if (!isBytesEqual(reader.readUInt8Array(8), headerMagic)) {
        file.error = FileError.FILE_NOT_BSPROF;
        throw "";
    }

    file.header.version = `${reader.readUInt32()}.${reader.readUInt32()}.${reader.readUInt32()}`;
    file.header.size = reader.readUInt32();
    file.header.requestedSampleRatio = reader.readFloat32();
    file.header.actualSampleRatio = reader.readFloat32();
    file.header.lineSpecificData = reader.readBool();
    file.header.memoryOperations = reader.readBool();
    file.header.targetRunStartTimestamp = reader.readUInt64();
    file.header.targetName = reader.readString();
    file.header.supplementalInfo = reader.readString();
    file.header.targetVersion = reader.readString();
    file.header.deviceVendorName = reader.readString();
    file.header.deviceModelNumber = reader.readString();
    file.header.deviceFirmwareVersion = reader.readString();

    reader.skipToIndex(file.header.size);
}
