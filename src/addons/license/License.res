@genType
type state = Absent | Correct | Different | Customized | Inconsistent

@genType
type decision = Ready({writeLicense: bool, writeMetadata: bool}) | RequireChoice(string) | Conflict(string)

@send external replace: (string, RegExp.t, string) => string = "replace"
let normalize = text => text->replace(%re("/^\s*(?:#\s*)?MIT License\s*/i"), "")->replace(%re("/\s+/g"), " ")->String.trim

let recognizedPreset = text => {
  let normalized = text->normalize->String.toLowerCase
  if normalized->String.includes("permission is hereby granted, free of charge") {
    Some("mit")
  } else if normalized->String.includes("apache license version 2.0") {
    Some("apache-2.0")
  } else if normalized->String.includes("bsd 3-clause license") || normalized->String.includes("redistribution and use in source and binary forms") {
    Some("bsd-3-clause")
  } else if normalized->String.includes("isc license") || normalized->String.includes("permission to use, copy, modify, and/or distribute this software") {
    Some("isc")
  } else {
    None
  }
}

@genType
let classify = (contents: array<string>, desired: string): state => {
  switch contents->Array.get(0) {
  | None => Absent
  | Some(first) =>
    let normalized = normalize(first)
    if contents->Array.some(text => normalize(text) != normalized) {
      Inconsistent
    } else if normalized == normalize(desired) {
      Correct
    } else if normalize(first->replace(%re("/Copyright \(c\) [^\r\n]+/"), "Copyright")) == normalize(desired->replace(%re("/Copyright \(c\) [^\r\n]+/"), "Copyright")) || switch (recognizedPreset(first), recognizedPreset(desired)) {
    | (Some(existing), Some(wanted)) => existing != wanted
    | _ => false
    } {
      Different
    } else {
      Customized
    }
  }
}

@genType
let reconcile = (state: state, metadataConflict: bool, metadataMissing: bool, force: bool, spdx: string): decision => {
  switch state {
  | Inconsistent => Conflict("Multiple inconsistent license files; resolve them before retrying.")
  | Different | Customized if !force => RequireChoice(`Existing license or package.json metadata differs. Replace it with ${spdx}?`)
  | _ if metadataConflict && !force => RequireChoice(`package.json license disagrees with ${spdx}. Replace that field?`)
  | Absent | Correct | Different | Customized => Ready({
      writeLicense: state != Correct,
      writeMetadata: metadataMissing || metadataConflict,
    })
  }
}

@genType
let decide = (contents: array<string>, desired: string, metadataConflict: bool, metadataMissing: bool, force: bool, spdx: string): decision =>
  reconcile(classify(contents, desired), metadataConflict, metadataMissing, force, spdx)
