// https://developer.roku.com/en-gb/docs/developer-program/dev-tools/brs-profiler-file-format.md#basic-information

import { Float32, UInt32, UInt64, UInt8, Utf8z } from "./ProfilerFile";

const VARINT_MSB = 0x80;
const VARINT_REST = 0x7F;

export class ByteReader {
    public index: number = 0;
    public readonly bytes: Buffer;
    public constructor(bytes: Buffer) {
        this.bytes = bytes;
    }

    public readUInt8(): UInt8 {
        const byte = this.bytes.readUInt8(this.index);
        this.index++;
        return byte;
    }

    public readUInt8Array(count: number): Uint8Array {
        const arr = new Uint8Array(count);
        for (let i = 0; i < count; i++) {
            arr[i] = this.readUInt8();
        }
        return arr;
    }

    public readBool(): boolean {
        return this.readUInt8() !== 0;
    }

    public readVarInt(): bigint {
        let value = 0n;
        let length = 0n;
        while (true) {
            const currentByte = this.readUInt8();
            const currentPart = BigInt(currentByte & VARINT_REST);
            value |= currentPart << length;
            length = length + 7n;
            if ((currentByte & VARINT_MSB) != VARINT_MSB) break;
        }
        return value;
    }

    public readUInt32(): UInt32 {
        return Number(this.readVarInt());
    }

    public readFloat32(): Float32 {
        const value = this.bytes.readFloatLE(this.index);
        this.index += 4;
        return value;
    }

    public readUInt64(): UInt64 {
        return this.readVarInt(); // same as readUInt32 but javascript doesn't discriminate between types
    }

    public readString(): Utf8z {
        let arr = [];
        while (true) {
            let currentByte = this.readUInt8();
            if (!currentByte) break;
            arr.push(currentByte);
        }
        return new TextDecoder("utf-8").decode(new Uint8Array(arr));
    }

    public skipToIndex(size: number) {
        this.index += (size - this.index);
    }

    public hasBytesToRead(): boolean {
        return this.bytesLeftover() > 0;
    }

    public bytesLeftover(): number {
        return this.bytes.length - this.index;
    }
}

export function isBytesEqual(source: Uint8Array, target: Uint8Array): boolean {
    if (source.length != target.length) return false;
    for (let i = 0; i < source.length; i++) {
        if (source[i] != target[i]) return false;
    }
    return true;
}
