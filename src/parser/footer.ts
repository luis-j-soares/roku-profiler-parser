import { ByteReader } from "../file/ByteReader";
import { ProfilerFile } from "../file/ProfilerFile";

// https://developer.roku.com/en-gb/docs/developer-program/dev-tools/brs-profiler-file-format.md#file-footer
export function parseFooter(file: ProfilerFile, reader: ByteReader) {
    file.footer.targetRunEndTimestamp = reader.readUInt64();
}
