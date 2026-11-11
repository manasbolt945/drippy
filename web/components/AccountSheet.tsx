"use client";

import type { Account } from "@/lib/backend";
import { StyledMascot } from "./KeepFitsSheet";

interface Props {
  account: Account;
  onFits: () => void;
  onLogOut: () => void;
  onClose: () => void;
}

/** Signed-in quick sheet until the full profile view exists: who you are, your fits, log out. */
export default function AccountSheet({ account, onFits, onLogOut, onClose }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Your account" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <StyledMascot size={80} />
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, wordBreak: "break-all", textAlign: "center" }}>{account.email ?? "Signed in"}</p>
        <button type="button" className="btn btn-gold" style={{ width: "100%" }} onClick={onFits}>Your fits</button>
        <button type="button" className="link-btn muted-link" onClick={onLogOut}>Log out</button>
      </div>
    </div>
  );
}
