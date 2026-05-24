// State-specific herd-share contract templates. Each one captures the
// substantive legal requirements for that state's herd-share regime —
// not legal advice; farms should still have a local attorney review
// before using them with shareholders.
//
// Variables in {{double-braces}} get filled at sign time.

export type StateCode =
  | "CO"
  | "ID"
  | "TN"
  | "VA"
  | "MI"
  | "OH"
  | "WV"
  | "CT"
  | "ND";

export type ContractTemplate = {
  code: StateCode;
  state: string;
  legalRegime: string;
  retentionYears: number;
  body: string; // Markdown
  requiredFields: { id: string; label: string; example: string }[];
  notes: string;
};

const SHAREHOLDER_FIELDS = [
  { id: "shareholder_name", label: "Shareholder full legal name", example: "Sarah Whitmore" },
  { id: "shareholder_address", label: "Shareholder address", example: "1402 Elm St., Athens OH 45701" },
  { id: "share_fraction", label: "Share fraction", example: "1/30" },
  { id: "buy_in_amount", label: "Share purchase price (USD)", example: "220.00" },
  { id: "monthly_boarding_fee", label: "Monthly boarding fee (USD)", example: "115.00" },
  { id: "allotment", label: "Weekly milk allotment", example: "2 gallons" },
  { id: "effective_date", label: "Effective date", example: "May 1, 2026" },
];

export const HERD_SHARE_TEMPLATES: ContractTemplate[] = [
  {
    code: "CO",
    state: "Colorado",
    legalRegime:
      "Colorado herd-share is permitted via private contract. Sale of raw milk is illegal; the shareholder is a co-owner of the cow and consuming milk from an animal they partially own. Monthly milk testing is required by the Raw Milk Association of Colorado; results must be retained for 3 years and made available to shareholders.",
    retentionYears: 3,
    requiredFields: SHAREHOLDER_FIELDS,
    notes:
      "CO requires monthly milk testing (standard plate count + coliforms) via a state-accredited lab. Records of every test must be kept for 3 years and posted to shareholders. The Raw Milk Association of Colorado provides the standards.",
    body: `# Bill of Sale and Boarding Agreement

This Agreement is made on {{effective_date}} between **{{farm_name}}**
("Farm"), located at {{farm_address}}, Colorado, and **{{shareholder_name}}**
("Shareholder"), residing at {{shareholder_address}}.

## 1. Sale of Ownership Interest

For value received (\${{buy_in_amount}}), the Farm hereby conveys to
the Shareholder an undivided **{{share_fraction}} ownership interest**
in the dairy livestock more particularly described in Schedule A
attached to this Agreement.

## 2. Boarding Services

The Shareholder retains the Farm to board, feed, milk, and provide
veterinary care for the Shareholder's interest in the livestock, in
exchange for a monthly boarding fee of **\${{monthly_boarding_fee}}**,
payable on the first of each month.

## 3. Milk Allotment

The Shareholder is entitled to **{{allotment}}** of raw milk per week,
representing the milk produced by the Shareholder's fractional interest
in the herd. Milk not collected within seven days will be redistributed
among the other shareholders or composted, at the Farm's discretion.

## 4. Compliance with Colorado Law

The Farm and Shareholder acknowledge that this Agreement is a private
contract for the boarding of livestock owned in part by the Shareholder,
and that no sale of raw milk occurs under this Agreement. The Farm
agrees to comply with the Raw Milk Association of Colorado's testing
standards, including monthly standard plate count and coliform testing
by a Colorado State University extension lab or equivalent. Test
results will be provided to the Shareholder within five days of each
test and retained by the Farm for three years.

## 5. Health and Risk Acknowledgement

The Shareholder acknowledges that raw milk has not been pasteurized
and may contain bacteria, including but not limited to *Listeria*,
*Salmonella*, *E. coli*, and *Campylobacter*. The Shareholder consumes
the milk at their own risk and on the basis that the milk comes from
an animal of which they are a partial owner.

## 6. Term and Termination

This Agreement remains in effect for so long as the Shareholder owns
an interest in the herd. Either party may terminate by giving thirty
(30) days written notice, after which the Farm will refund the
unprorated portion of any prepaid boarding fee.

---

**Farm:** {{farm_name}}
By: ______________________________  Date: __________

**Shareholder:** {{shareholder_name}}
Signature: ________________________  Date: __________

*This agreement is intended to comply with Colorado herd-share law as
generally understood as of 2026. Both parties are advised to retain
their own counsel before signing.*
`,
  },
  {
    code: "ID",
    state: "Idaho",
    legalRegime:
      "Idaho permits both small-herd raw milk sales (with a license) and herd shares. Herd-share agreements do not require licensing but the contract should make ownership and boarding explicit. Test records should be kept for at least 3 years.",
    retentionYears: 3,
    requiredFields: SHAREHOLDER_FIELDS,
    notes:
      "Idaho's regime is more permissive than CO's. Some farms operate as licensed micro-dairies AND offer herd shares for members who want raw milk at lower cost. The contract below assumes the herd-share path.",
    body: `# Idaho Herd-Share Agreement

Made {{effective_date}} between **{{farm_name}}** ("Farm") and
**{{shareholder_name}}** ("Shareholder").

## I. Ownership

The Shareholder hereby purchases, for the sum of **\${{buy_in_amount}}**,
a **{{share_fraction}} ownership interest** in the dairy herd boarded
at the Farm. This interest is conveyed as a sale of personal property
under the Idaho Uniform Commercial Code.

## II. Boarding

The Farm agrees to board the Shareholder's ownership interest at a
fee of **\${{monthly_boarding_fee}} per month**, including all feed,
pasture, veterinary care, and milking labor.

## III. Allotment

The Shareholder is entitled to **{{allotment}}** of raw milk per week
in compensation for the milk produced by the Shareholder's interest.

## IV. Acknowledgement

The Shareholder acknowledges that the milk is raw and unpasteurized
and accepts the risks associated. The Shareholder is consuming milk
from an animal they own a partial interest in.

## V. Term

Effective indefinitely upon signing, terminable by either party with
thirty (30) days written notice.

---

**Farm:** {{farm_name}}        Date: __________
**Shareholder:** {{shareholder_name}}    Date: __________
`,
  },
  {
    code: "TN",
    state: "Tennessee",
    legalRegime:
      "Tennessee permits herd shares under T.C.A. § 53-3-119, which exempts \"the independent or partial owner of any hooved mammal\" from sale-of-milk regulations. Contract should establish bona fide ownership and a separate boarding fee.",
    retentionYears: 3,
    requiredFields: SHAREHOLDER_FIELDS,
    notes:
      "Tennessee's statute (53-3-119) is the most permissive in the country — explicitly carves out herd shares. The contract must make ownership and boarding fee separable.",
    body: `# Tennessee Herd-Share Agreement
*Pursuant to T.C.A. § 53-3-119*

Made on {{effective_date}}, between **{{farm_name}}** ("Farm") and
**{{shareholder_name}}** ("Shareholder").

## Section 1 — Conveyance of Ownership

In consideration of **\${{buy_in_amount}}** paid by the Shareholder to
the Farm, the Farm hereby sells and conveys to the Shareholder a
**{{share_fraction}}** undivided ownership interest in the dairy
livestock identified in the herd register maintained by the Farm. This
sale is final and is the sole transfer of property contemplated by
this Agreement.

## Section 2 — Boarding Fee

The Farm agrees to provide boarding services — feed, pasture,
veterinary care, milking, and storage — for the Shareholder's
ownership interest, in exchange for a monthly fee of
**\${{monthly_boarding_fee}}**, payable on the first of each month.
This fee is paid for services rendered and not for milk; the milk
produced by the Shareholder's interest belongs to the Shareholder
from the moment of milking.

## Section 3 — Allotment

The Shareholder may collect up to **{{allotment}}** of raw milk per
week, representing the milk produced by the Shareholder's ownership
interest.

## Section 4 — Statutory Acknowledgement

The Shareholder acknowledges that, as an "independent or partial
owner of any hooved mammal" within the meaning of T.C.A. § 53-3-119,
the Shareholder's consumption of milk produced by their own livestock
is exempt from Tennessee's sale-of-milk regulations.

## Section 5 — Term

This Agreement remains in force until terminated by either party on
thirty (30) days written notice. Upon termination, the Farm will
repurchase the Shareholder's ownership interest at the original buy-in
amount, less any unpaid boarding fees.

---

**Farm:** {{farm_name}}        Date: __________
**Shareholder:** {{shareholder_name}}    Date: __________
`,
  },
  {
    code: "VA",
    state: "Virginia",
    legalRegime:
      "Virginia recognizes herd shares as private property contracts. No specific statute, but the practice is well-established. Contract should clearly establish ownership.",
    retentionYears: 3,
    requiredFields: SHAREHOLDER_FIELDS,
    notes:
      "Virginia has no specific herd-share statute but the practice is recognized in case law. Belongs in the same family as CO and TN.",
    body: `# Virginia Herd-Share Agreement

Made {{effective_date}} between **{{farm_name}}** and
**{{shareholder_name}}**.

## 1. Ownership Sale

For **\${{buy_in_amount}}**, the Farm conveys to the Shareholder a
**{{share_fraction}}** ownership interest in the dairy herd. This sale
is a transfer of personal property under the Virginia Uniform
Commercial Code.

## 2. Boarding Agreement

The Farm shall board the Shareholder's interest for
**\${{monthly_boarding_fee}}** per month. This fee covers feed,
pasture, veterinary care, and milking labor.

## 3. Weekly Allotment

The Shareholder is entitled to **{{allotment}}** of raw milk per week.

## 4. Acknowledgement

The Shareholder consumes raw milk from an animal they partially own
and assumes the risks therein.

## 5. Termination

Terminable on thirty (30) days notice; the Farm will repurchase the
Shareholder's interest at the original buy-in amount.

---

**Farm:** {{farm_name}}        Date: __________
**Shareholder:** {{shareholder_name}}    Date: __________
`,
  },
  {
    code: "MI",
    state: "Michigan",
    legalRegime:
      "Michigan permits herd shares with strict contract requirements per the Michigan Dairy Law. The contract must clearly establish ownership and the boarding fee must be separately stated.",
    retentionYears: 3,
    requiredFields: SHAREHOLDER_FIELDS,
    notes:
      "Michigan requires that the contract distinguish ownership-of-cow from purchase-of-milk on its face. Be explicit.",
    body: `# Michigan Bill of Sale and Boarding Agreement

Made {{effective_date}} between **{{farm_name}}** and
**{{shareholder_name}}**, who is the legal owner of a
**{{share_fraction}}** undivided interest in the dairy livestock
described below, having purchased said interest from the Farm on this
date for **\${{buy_in_amount}}**.

The Shareholder herein appoints the Farm as agent to board, feed,
milk, and care for the livestock at a fee of
**\${{monthly_boarding_fee}}** per month, payable in advance on the
first of each month.

The Shareholder is entitled to **{{allotment}}** of raw milk per week,
representing the share of total herd production attributable to the
Shareholder's ownership interest.

The Shareholder acknowledges that no sale of milk occurs under this
Agreement and that the Shareholder consumes raw milk from livestock
the Shareholder partially owns. The risks of raw milk are accepted.

This Agreement is governed by Michigan law and terminable on thirty
(30) days written notice.

---

**Farm:** {{farm_name}}        Date: __________
**Shareholder:** {{shareholder_name}}    Date: __________
`,
  },
];

export function templateFor(code: StateCode): ContractTemplate | undefined {
  return HERD_SHARE_TEMPLATES.find((t) => t.code === code);
}

export function render(
  body: string,
  values: Record<string, string>,
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
}
