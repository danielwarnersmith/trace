//
//  ULID.swift
//  Trace
//
//  Minimal ULID generation (timestamp ms + random, Crockford base32, 26 chars).
//

import Foundation

private let crockford = Array("0123456789ABCDEFGHJKMNPQRSTVWXYZ")

/// Generates a new ULID string (26 characters, Crockford base32).
func ulid() -> String {
    var bytes = [UInt8](repeating: 0, count: 16)
    // First 6 bytes: timestamp in ms (big-endian), 48 bits
    let ms = UInt64(Date().timeIntervalSince1970 * 1000)
    bytes[0] = UInt8((ms >> 40) & 0xFF)
    bytes[1] = UInt8((ms >> 32) & 0xFF)
    bytes[2] = UInt8((ms >> 24) & 0xFF)
    bytes[3] = UInt8((ms >> 16) & 0xFF)
    bytes[4] = UInt8((ms >> 8) & 0xFF)
    bytes[5] = UInt8(ms & 0xFF)
    // Last 10 bytes: random
    _ = SecRandomCopyBytes(kSecRandomDefault, 10, &bytes[6])
    // Encode to Crockford base32 (5 bits per char); 128 bits -> 25 full chars + 3 bits; pad to 26 chars
    var result = ""
    var n = 0
    var bits = 0
    for i in 0..<16 {
        n = (n << 8) | Int(bytes[i])
        bits += 8
        while bits >= 5 {
            bits -= 5
            let idx = (n >> bits) & 0x1F
            result.append(crockford[idx])
        }
    }
    if bits > 0 {
        n <<= (5 - bits)
        let idx = n & 0x1F
        result.append(crockford[idx])
    }
    return String(result.prefix(26))
}
