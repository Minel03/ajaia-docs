import { describe, expect, it } from "vitest";
import { getDocumentCapabilities } from "./document-capabilities";

describe("document role capabilities", () => {
  it("allows owners to edit and share", () => {
    expect(getDocumentCapabilities("owner")).toEqual({ canEdit: true, canShare: true });
  });

  it("allows editors to edit but not share", () => {
    expect(getDocumentCapabilities("editor")).toEqual({ canEdit: true, canShare: false });
  });

  it("makes viewers read-only without sharing controls", () => {
    expect(getDocumentCapabilities("viewer")).toEqual({ canEdit: false, canShare: false });
  });
});
