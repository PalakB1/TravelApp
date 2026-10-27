import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

export type QuoteLineProps = {
  label: string;
  detail?: string | null;
  qty: string;
  rate: string;
  amount: string;
};

export type QuoteDocProps = {
  agency: string;
  logo?: string | null;
  poweredBy?: boolean;
  gstAddress?: string | null;
  gstin?: string | null;
  taxIdLabel: string;

  quoteNo?: string | null;
  date: string;
  validUntil?: string | null;
  expired?: boolean;

  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  pax?: string | null;

  title: string;
  lines: QuoteLineProps[];
  subtotal: string;
  taxLabel: string;
  taxRate: number;
  tax: string;
  nonTaxable?: string | null;
  total: string;
  perPerson?: string | null;
  notes?: string | null;
};

const s = StyleSheet.create({
  page: { padding: 42, fontSize: 10, fontFamily: "Helvetica", color: "#1b1c2b" },
  logo: { height: 42, maxWidth: 150, objectFit: "contain", marginBottom: 8, alignSelf: "center" },
  agency: { fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "center" },
  sub: { textAlign: "center", color: "#5a5d74", fontSize: 9, marginTop: 2 },
  title: { marginTop: 12, fontSize: 11, fontFamily: "Helvetica-Bold", letterSpacing: 2, textAlign: "center" },
  rule: { borderBottomWidth: 2, borderBottomColor: "#d2d4e6", marginTop: 12, marginBottom: 16 },

  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  metaLabel: { color: "#5a5d74", fontSize: 9 },
  right: { textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },

  warn: { backgroundColor: "#fdf3e7", padding: 10, marginBottom: 14, fontSize: 9, color: "#7a4a12" },

  tripLine: { fontFamily: "Helvetica-Bold", marginBottom: 8 },
  head: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#d2d4e6", paddingBottom: 5 },
  headCell: { color: "#5a5d74", fontSize: 8, letterSpacing: 1 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eceef6", paddingTop: 7, paddingBottom: 7 },
  cItem: { flex: 1 },
  cQty: { width: 44, textAlign: "right" },
  cRate: { width: 86, textAlign: "right" },
  cAmt: { width: 96, textAlign: "right" },
  detail: { color: "#5a5d74", fontSize: 8, marginTop: 2 },

  totalRow: { flexDirection: "row", justifyContent: "flex-end", paddingTop: 5 },
  totalLabel: { width: 150, textAlign: "right", color: "#5a5d74", paddingRight: 10 },
  totalValue: { width: 96, textAlign: "right" },

  notesTitle: { marginTop: 20, fontFamily: "Helvetica-Bold", marginBottom: 5 },
  notes: { fontSize: 9, lineHeight: 1.6, color: "#3a3d52" },
  footer: { marginTop: 24, textAlign: "center", color: "#5a5d74", fontSize: 9 },
  poweredBy: { marginTop: 14, textAlign: "center", color: "#9094ac", fontSize: 8 },
});

// The quotation as a file the client can keep, forward to whoever signs things
// off, and come back to in a month. The HTML page is the same document; this is
// the one that survives being emailed on.
export default function QuoteDoc(p: QuoteDocProps) {
  return (
    <Document title={`Quotation ${p.quoteNo ?? ""} ${p.clientName}`.trim()} author={p.agency}>
      <Page size="A4" style={s.page}>
        {p.logo ? <Image src={p.logo} style={s.logo} /> : null}
        <Text style={s.agency}>{p.agency}</Text>
        {p.gstAddress ? <Text style={s.sub}>{p.gstAddress}</Text> : null}
        {p.gstin ? <Text style={s.sub}>{p.taxIdLabel}: {p.gstin}</Text> : null}
        <Text style={s.title}>QUOTATION</Text>
        <View style={s.rule} />

        {p.expired ? (
          <Text style={s.warn}>
            This quotation has passed its validity date. Please ask us to confirm the prices before booking.
          </Text>
        ) : null}

        <View style={s.meta}>
          <View>
            <Text style={s.metaLabel}>Prepared for</Text>
            <Text style={s.bold}>{p.clientName}</Text>
            {p.clientPhone ? <Text style={s.metaLabel}>{p.clientPhone}</Text> : null}
            {p.clientEmail ? <Text style={s.metaLabel}>{p.clientEmail}</Text> : null}
          </View>
          <View style={s.right}>
            {p.quoteNo ? <Text><Text style={s.metaLabel}>Quotation no. </Text>{p.quoteNo}</Text> : null}
            <Text><Text style={s.metaLabel}>Date </Text>{p.date}</Text>
            {p.validUntil ? <Text><Text style={s.metaLabel}>Valid until </Text>{p.validUntil}</Text> : null}
            {p.pax ? <Text><Text style={s.metaLabel}>Travellers </Text>{p.pax}</Text> : null}
          </View>
        </View>

        <Text style={s.tripLine}>{p.title}</Text>

        <View style={s.head}>
          <Text style={[s.headCell, s.cItem]}>ITEM</Text>
          <Text style={[s.headCell, s.cQty]}>QTY</Text>
          <Text style={[s.headCell, s.cRate]}>RATE</Text>
          <Text style={[s.headCell, s.cAmt]}>AMOUNT</Text>
        </View>

        {p.lines.map((l, i) => (
          <View style={s.row} key={i} wrap={false}>
            <View style={s.cItem}>
              <Text>{l.label}</Text>
              {l.detail ? <Text style={s.detail}>{l.detail}</Text> : null}
            </View>
            <Text style={s.cQty}>{l.qty}</Text>
            <Text style={s.cRate}>{l.rate}</Text>
            <Text style={[s.cAmt, s.bold]}>{l.amount}</Text>
          </View>
        ))}

        <View style={s.totalRow}><Text style={s.totalLabel}>Subtotal</Text><Text style={s.totalValue}>{p.subtotal}</Text></View>
        <View style={s.totalRow}><Text style={s.totalLabel}>{p.taxLabel} @ {p.taxRate}%</Text><Text style={s.totalValue}>{p.tax}</Text></View>
        {p.nonTaxable ? (
          <View style={s.totalRow}><Text style={s.totalLabel}>At cost (no {p.taxLabel})</Text><Text style={s.totalValue}>{p.nonTaxable}</Text></View>
        ) : null}
        <View style={s.totalRow}>
          <Text style={[s.totalLabel, s.bold]}>Total</Text>
          <Text style={[s.totalValue, s.bold]}>{p.total}</Text>
        </View>
        {p.perPerson ? (
          <View style={s.totalRow}><Text style={s.totalLabel}>Per person</Text><Text style={s.totalValue}>{p.perPerson}</Text></View>
        ) : null}

        {p.notes ? (
          <>
            <Text style={s.notesTitle}>Please note</Text>
            <Text style={s.notes}>{p.notes}</Text>
          </>
        ) : null}

        <Text style={s.footer}>
          This is a quotation, not an invoice - nothing is held or charged until you confirm.
          {p.validUntil ? ` Prices are held until ${p.validUntil}.` : ""}
        </Text>
        {p.poweredBy ? <Text style={s.poweredBy}>Powered by TripZei</Text> : null}
      </Page>
    </Document>
  );
}
