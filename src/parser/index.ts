import { ByteReader } from "../file/ByteReader";
import { parseBody } from "./body";
import { ProfilerFile, FileError } from "../file/ProfilerFile";
import { parseHeader } from "./header";
import { parseFooter } from "./footer";

export function parseFile(bytes: Buffer): ProfilerFile {
    const reader = new ByteReader(bytes);
    const file = new ProfilerFile();

    try {
        parseHeader(file, reader);
        parseBody(file, reader);
        parseFooter(file, reader);
    }
    catch (e) {
        if (!file.error) file.error = FileError.PARSE_ERROR;
        if (!file.errorException) file.errorException = e;
    }

    return file;
}
