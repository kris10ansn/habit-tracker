// QR Code Model 2 encoder for the pairing payload. Pairing codes use a compact uppercase
// alphanumeric envelope, so version 2 with medium error correction is deliberately enough; a
// larger general-purpose encoder would add code paths the Qt 5 device never exercises.

const SIZE = 25;
const DATA_CODEWORDS = 28;
const ERROR_CORRECTION_CODEWORDS = 16;
const MAXIMUM_ALPHANUMERIC_CHARACTERS = 38;
const ALPHANUMERIC_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

function encodeAlphanumeric(text) {
    _validateText(text);

    const dataCodewords = _createDataCodewords(text);
    const errorCorrectionCodewords =
        _createErrorCorrectionCodewords(dataCodewords);
    const allCodewords = dataCodewords.concat(errorCorrectionCodewords);
    const functionPattern = _createBooleanMatrix(false);
    const baseModules = _createNullableMatrix();
    _drawFunctionPatterns(baseModules, functionPattern);

    let bestModules = null;
    let lowestPenalty = Infinity;
    for (let mask = 0; mask < 8; mask += 1) {
        const candidateModules = baseModules.map((row) => row.slice());
        _drawCodewords(candidateModules, functionPattern, allCodewords, mask);
        _drawFormatBits(candidateModules, functionPattern, mask);

        const penalty = _penaltyScore(candidateModules);
        if (penalty < lowestPenalty) {
            bestModules = candidateModules;
            lowestPenalty = penalty;
        }
    }

    return bestModules;
}

function _validateText(text) {
    if (typeof text !== "string" || !text.length) {
        throw new Error("QR text must not be empty");
    }
    if (text.length > MAXIMUM_ALPHANUMERIC_CHARACTERS) {
        throw new Error("QR text is too long");
    }

    const unsupportedCharacter = [...text].find(
        (character) => !ALPHANUMERIC_CHARACTERS.includes(character),
    );
    if (unsupportedCharacter) {
        throw new Error(
            `QR text contains unsupported character: ${unsupportedCharacter}`,
        );
    }
}

function _createDataCodewords(text) {
    const bits = [];
    _appendBits(bits, 0x2, 4);
    _appendBits(bits, text.length, 9);

    let characterIndex = 0;
    while (characterIndex + 1 < text.length) {
        const firstValue = ALPHANUMERIC_CHARACTERS.indexOf(
            text[characterIndex],
        );
        const secondValue = ALPHANUMERIC_CHARACTERS.indexOf(
            text[characterIndex + 1],
        );
        _appendBits(bits, firstValue * 45 + secondValue, 11);
        characterIndex += 2;
    }
    if (characterIndex < text.length) {
        _appendBits(
            bits,
            ALPHANUMERIC_CHARACTERS.indexOf(text[characterIndex]),
            6,
        );
    }

    const capacityBits = DATA_CODEWORDS * 8;
    _appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
    _appendBits(bits, 0, (8 - (bits.length % 8)) % 8);

    const codewords = _bitsToCodewords(bits);
    let padCodeword = 0xec;
    while (codewords.length < DATA_CODEWORDS) {
        codewords.push(padCodeword);
        padCodeword = padCodeword === 0xec ? 0x11 : 0xec;
    }

    return codewords;
}

function _appendBits(bits, value, bitCount) {
    for (let shift = bitCount - 1; shift >= 0; shift -= 1) {
        bits.push(((value >>> shift) & 1) !== 0);
    }
}

function _bitsToCodewords(bits) {
    const codewords = [];
    for (let bitIndex = 0; bitIndex < bits.length; bitIndex += 8) {
        let codeword = 0;
        for (let offset = 0; offset < 8; offset += 1) {
            codeword = (codeword << 1) | (bits[bitIndex + offset] ? 1 : 0);
        }
        codewords.push(codeword);
    }

    return codewords;
}

function _createErrorCorrectionCodewords(dataCodewords) {
    const generator = _reedSolomonGenerator(ERROR_CORRECTION_CODEWORDS);
    const remainder = new Array(ERROR_CORRECTION_CODEWORDS).fill(0);

    dataCodewords.forEach((codeword) => {
        const factor = codeword ^ remainder[0];
        remainder.shift();
        remainder.push(0);
        generator.slice(1).forEach((coefficient, index) => {
            remainder[index] ^= _multiplyInField(coefficient, factor);
        });
    });

    return remainder;
}

function _reedSolomonGenerator(degree) {
    let generator = [1];
    let root = 1;
    for (let factorIndex = 0; factorIndex < degree; factorIndex += 1) {
        const nextGenerator = new Array(generator.length + 1).fill(0);
        generator.forEach((coefficient, index) => {
            nextGenerator[index] ^= coefficient;
            nextGenerator[index + 1] ^= _multiplyInField(coefficient, root);
        });
        generator = nextGenerator;
        root = _multiplyInField(root, 0x02);
    }

    return generator;
}

function _multiplyInField(left, right) {
    let product = 0;
    for (let bitIndex = 7; bitIndex >= 0; bitIndex -= 1) {
        product = (product << 1) ^ ((product >>> 7) * 0x11d);
        product ^= ((right >>> bitIndex) & 1) * left;
    }

    return product;
}

function _createNullableMatrix() {
    return new Array(SIZE).fill(null).map(() => new Array(SIZE).fill(null));
}

function _createBooleanMatrix(value) {
    return new Array(SIZE).fill(null).map(() => new Array(SIZE).fill(value));
}

function _setFunctionModule(modules, functionPattern, row, column, dark) {
    modules[row][column] = dark;
    functionPattern[row][column] = true;
}

function _drawFunctionPatterns(modules, functionPattern) {
    for (let position = 0; position < SIZE; position += 1) {
        _setFunctionModule(
            modules,
            functionPattern,
            6,
            position,
            position % 2 === 0,
        );
        _setFunctionModule(
            modules,
            functionPattern,
            position,
            6,
            position % 2 === 0,
        );
    }

    _drawFinderPattern(modules, functionPattern, 3, 3);
    _drawFinderPattern(modules, functionPattern, 3, SIZE - 4);
    _drawFinderPattern(modules, functionPattern, SIZE - 4, 3);
    _drawAlignmentPattern(modules, functionPattern, SIZE - 7, SIZE - 7);
    _drawFormatBits(modules, functionPattern, 0);
}

function _drawFinderPattern(modules, functionPattern, centerRow, centerColumn) {
    for (let rowOffset = -4; rowOffset <= 4; rowOffset += 1) {
        for (let columnOffset = -4; columnOffset <= 4; columnOffset += 1) {
            const row = centerRow + rowOffset;
            const column = centerColumn + columnOffset;
            if (row < 0 || row >= SIZE || column < 0 || column >= SIZE) {
                continue;
            }

            const distance = Math.max(
                Math.abs(rowOffset),
                Math.abs(columnOffset),
            );
            _setFunctionModule(
                modules,
                functionPattern,
                row,
                column,
                distance !== 2 && distance !== 4,
            );
        }
    }
}

function _drawAlignmentPattern(
    modules,
    functionPattern,
    centerRow,
    centerColumn,
) {
    for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
        for (let columnOffset = -2; columnOffset <= 2; columnOffset += 1) {
            const distance = Math.max(
                Math.abs(rowOffset),
                Math.abs(columnOffset),
            );
            _setFunctionModule(
                modules,
                functionPattern,
                centerRow + rowOffset,
                centerColumn + columnOffset,
                distance !== 1,
            );
        }
    }
}

function _drawFormatBits(modules, functionPattern, mask) {
    const formatBits = _formatBits(mask);
    const bit = (index) => ((formatBits >>> index) & 1) !== 0;

    for (let index = 0; index <= 5; index += 1) {
        _setFunctionModule(modules, functionPattern, index, 8, bit(index));
    }
    _setFunctionModule(modules, functionPattern, 7, 8, bit(6));
    _setFunctionModule(modules, functionPattern, 8, 8, bit(7));
    _setFunctionModule(modules, functionPattern, 8, 7, bit(8));
    for (let index = 9; index < 15; index += 1) {
        _setFunctionModule(modules, functionPattern, 8, 14 - index, bit(index));
    }

    for (let index = 0; index < 8; index += 1) {
        _setFunctionModule(
            modules,
            functionPattern,
            8,
            SIZE - 1 - index,
            bit(index),
        );
    }
    for (let index = 8; index < 15; index += 1) {
        _setFunctionModule(
            modules,
            functionPattern,
            SIZE - 15 + index,
            8,
            bit(index),
        );
    }
    _setFunctionModule(modules, functionPattern, SIZE - 8, 8, true);
}

function _formatBits(mask) {
    let remainder = mask;
    for (let bitIndex = 0; bitIndex < 10; bitIndex += 1) {
        remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    }

    return ((mask << 10) | remainder) ^ 0x5412;
}

function _drawCodewords(modules, functionPattern, codewords, mask) {
    const dataBits = [];
    codewords.forEach((codeword) => _appendBits(dataBits, codeword, 8));

    let bitIndex = 0;
    for (let rightColumn = SIZE - 1; rightColumn >= 1; rightColumn -= 2) {
        if (rightColumn === 6) {
            rightColumn = 5;
        }

        const upward = ((rightColumn + 1) & 2) === 0;
        for (
            let verticalOffset = 0;
            verticalOffset < SIZE;
            verticalOffset += 1
        ) {
            const row = upward ? SIZE - 1 - verticalOffset : verticalOffset;
            for (let columnOffset = 0; columnOffset < 2; columnOffset += 1) {
                const column = rightColumn - columnOffset;
                if (functionPattern[row][column]) {
                    continue;
                }

                const dataBit =
                    bitIndex < dataBits.length && dataBits[bitIndex];
                modules[row][column] = dataBit !== _maskBit(mask, row, column);
                bitIndex += 1;
            }
        }
    }
}

function _maskBit(mask, row, column) {
    switch (mask) {
        case 0:
            return (row + column) % 2 === 0;
        case 1:
            return row % 2 === 0;
        case 2:
            return column % 3 === 0;
        case 3:
            return (row + column) % 3 === 0;
        case 4:
            return (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0;
        case 5:
            return ((row * column) % 2) + ((row * column) % 3) === 0;
        case 6:
            return (((row * column) % 2) + ((row * column) % 3)) % 2 === 0;
        case 7:
            return (((row + column) % 2) + ((row * column) % 3)) % 2 === 0;
        default:
            throw new Error("Unknown QR mask");
    }
}

function _penaltyScore(modules) {
    return (
        _adjacentPenalty(modules) +
        _blockPenalty(modules) +
        _finderLikePenalty(modules) +
        _balancePenalty(modules)
    );
}

function _adjacentPenalty(modules) {
    const lines = modules.concat(_columns(modules));

    return lines.reduce((total, line) => {
        let linePenalty = 0;
        let runLength = 1;
        for (let index = 1; index < line.length; index += 1) {
            if (line[index] === line[index - 1]) {
                runLength += 1;
                linePenalty += runLength === 5 ? 3 : runLength > 5 ? 1 : 0;
            } else {
                runLength = 1;
            }
        }

        return total + linePenalty;
    }, 0);
}

function _blockPenalty(modules) {
    let penalty = 0;
    for (let row = 0; row < SIZE - 1; row += 1) {
        for (let column = 0; column < SIZE - 1; column += 1) {
            const value = modules[row][column];
            if (
                value === modules[row][column + 1] &&
                value === modules[row + 1][column] &&
                value === modules[row + 1][column + 1]
            ) {
                penalty += 3;
            }
        }
    }

    return penalty;
}

function _finderLikePenalty(modules) {
    return modules
        .concat(_columns(modules))
        .reduce((total, line) => total + _finderLikeLinePenalty(line), 0);
}

function _finderLikeLinePenalty(line) {
    let penalty = 0;
    for (let start = 0; start <= line.length - 7; start += 1) {
        if (!_matchesFinderCore(line, start)) {
            continue;
        }

        const hasLightBefore = _hasFourLightModules(line, start - 4, start);
        const hasLightAfter = _hasFourLightModules(line, start + 7, start + 11);
        if (hasLightBefore || hasLightAfter) {
            penalty += 40;
        }
    }

    return penalty;
}

function _matchesFinderCore(line, start) {
    const finderCore = [true, false, true, true, true, false, true];
    return finderCore.every((value, offset) => line[start + offset] === value);
}

function _hasFourLightModules(line, start, end) {
    for (let index = start; index < end; index += 1) {
        if (index >= 0 && index < line.length && line[index]) {
            return false;
        }
    }

    return true;
}

function _balancePenalty(modules) {
    const darkModules = modules.reduce(
        (total, row) => total + row.filter(Boolean).length,
        0,
    );
    const totalModules = SIZE * SIZE;
    const deviation =
        Math.ceil(
            Math.abs(darkModules * 20 - totalModules * 10) / totalModules,
        ) - 1;
    return Math.max(0, deviation) * 10;
}

function _columns(modules) {
    return modules[0].map((unused, column) =>
        modules.map((row) => row[column]),
    );
}
