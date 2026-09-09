@genType
type state = Absent | Correct | Different | Customized | Inconsistent

@genType
type decision = Ready({writeLicense: bool, writeMetadata: bool}) | RequireChoice(string) | Conflict(string)

@send external replace: (string, RegExp.t, string) => string = "replace"
let normalize = text => text->replace(%re("/^\s*(?:#\s*)?MIT License\s*/i"), "")->replace(%re("/\s+/g"), " ")->String.trim

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
    } else if normalize(first->replace(%re("/Copyright \(c\) [^\r\n]+/"), "Copyright")) == normalize(desired->replace(%re("/Copyright \(c\) [^\r\n]+/"), "Copyright")) || normalized->String.includes("Apache License Version 2.0") || normalized->String.includes("GNU GENERAL PUBLIC LICENSE Version") {
      Different
    } else {
      Customized
    }
  }
}

@genType
let reconcile = (state: state, metadataConflict: bool, metadataMissing: bool, force: bool): decision => {
  switch state {
  | Inconsistent => Conflict("Multiple inconsistent license files; resolve them before retrying.")
  | Different | Customized if !force => RequireChoice("Existing license differs or contains custom text. Replace it with MIT?")
  | _ if metadataConflict && !force => RequireChoice("package.json license disagrees with MIT. Replace that field?")
  | Absent | Correct | Different | Customized => Ready({
      writeLicense: state != Correct,
      writeMetadata: metadataMissing || metadataConflict,
    })
  }
}
