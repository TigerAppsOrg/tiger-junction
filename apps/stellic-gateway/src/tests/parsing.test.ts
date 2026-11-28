import { describe, test, expect } from "bun:test";
import { parseForm, parseCasError } from "../stellic/http.ts";
import {
  parseStellicJson,
  samlSessionDeadline,
  sessionExpiry,
} from "../stellic/session.ts";
import type { Response } from "../stellic/http.ts";

function res(text: string, extra: Partial<Response> = {}): Response {
  return {
    url: "https://stellic.princeton.edu/x",
    status: 200,
    text,
    history: [],
    ...extra,
  };
}

describe("parseForm", () => {
  test("returns a null action when there is no form", () => {
    expect(parseForm(`<p>no form here</p>`).action).toBeNull();
  });

  test("reads a full SAML auto-submit page, including <noscript> inputs", () => {
    const html = `<!DOCTYPE html><html><head><title>x</title></head>
      <body onload="document.forms[0].submit()">
        <form method="post" action="https://stellic.princeton.edu/saml/acs/">
          <input type="hidden" name="SAMLResponse" value="abc&#x3d;"/>
          <noscript><input type="hidden" name="RelayState" value="/app/?a=1&amp;b=2"/></noscript>
          <input type="hidden" name="empty"/>
        </form>
      </body></html>`;
    expect(parseForm(html)).toEqual({
      action: "https://stellic.princeton.edu/saml/acs/",
      inputs: { SAMLResponse: "abc=", RelayState: "/app/?a=1&b=2", empty: "" },
    });
  });
});

describe("parseCasError", () => {
  test("extracts the error panel text", () => {
    const html = `<div id="loginErrorsPanel"><span>The credentials you provided cannot be determined to be authentic.</span></div>`;
    expect(parseCasError(html)).toBe(
      "The credentials you provided cannot be determined to be authentic.",
    );
  });
  test("returns null without a panel", () => {
    expect(parseCasError(`<div>fine</div>`)).toBeNull();
  });
});

describe("parseStellicJson", () => {
  test("strips the )]}', XSSI guard", () => {
    const body = parseStellicJson(
      res(`)]}',\n{"success": true, "session_remaining_time": 3599}`),
    );
    expect(body.success).toBe(true);
    expect(body.session_remaining_time).toBe(3599);
  });

  test("throws a descriptive error on an HTML login page", () => {
    const html = res(`<!DOCTYPE html><html><body>login</body></html>`, {
      status: 200,
      history: [302],
      url: "https://fed.princeton.edu/cas/login",
    });
    expect(() => parseStellicJson(html)).toThrow(/Expected JSON from Stellic/);
  });
});

describe("samlSessionDeadline", () => {
  const saml = (xml: string) => Buffer.from(xml, "utf8").toString("base64");

  test("reads SessionNotOnOrAfter from the AuthnStatement", () => {
    const xml =
      `<samlp:Response><saml:Assertion>` +
      `<saml:SubjectConfirmationData NotOnOrAfter="2026-09-26T22:09:53.304Z"/>` +
      `<saml:AuthnStatement AuthnInstant="2026-09-26T22:09:23.123Z" SessionNotOnOrAfter="2026-09-26T23:09:53.299Z"/>` +
      `</saml:Assertion></samlp:Response>`;
    expect(samlSessionDeadline(saml(xml))?.toISOString()).toBe(
      "2026-09-26T23:09:53.299Z",
    );
  });

  test("is null without one, e.g. for an encrypted assertion", () => {
    expect(
      samlSessionDeadline(saml("<samlp:Response><EncryptedAssertion/>")),
    ).toBeNull();
  });
});

describe("sessionExpiry", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  const info = { remainingSeconds: 3600 };

  test("the SAML deadline wins when it comes first", () => {
    const saml = new Date(now + 30 * 60_000);
    expect(sessionExpiry(info, saml, now)).toEqual(saml);
  });

  test("the idle timeout wins when it comes first", () => {
    const saml = new Date(now + 2 * 3600_000);
    expect(sessionExpiry(info, saml, now)).toEqual(new Date(now + 3600_000));
  });

  test("without a SAML deadline the idle timeout is used", () => {
    expect(sessionExpiry(info, null, now)).toEqual(new Date(now + 3600_000));
  });
});
