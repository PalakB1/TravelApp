import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

export type InvoiceProps = {
  agency: string; gstAddress?: string | null; gstin?: string | null; gstState?: string | null; gstStateCode?: string | null;
  logo?: string | null; sacCode: string; note?: string | null;
  invoiceNo: string; date: string;
  customerName: string; customerContact?: string; tripName: string; pax: number;
  taxable: string; nonTax: string; cgst: string; sgst: string; tcs: string; total: string; paid: string; balance: string;
  gstHalfRate: number; tcsRate: number; nonTaxNum: number;
  amountWords: string;
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1b1c2b" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: "#d2d4e6", paddingBottom: 10, marginBottom: 12 },
  logo: { height: 40, maxWidth: 110, objectFit: "contain", marginRight: 10 },
  agency: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  muted: { color: "#5a5d74", fontSize: 9 },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  billLabel: { color: "#5a5d74", fontSize: 8, textTransform: "uppercase", marginBottom: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
  th: { flexDirection: "row", backgroundColor: "#f6f7fc", paddingVertical: 5, paddingHorizontal: 8, fontSize: 8, color: "#5a5d74", textTransform: "uppercase" },
  tr: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e6e7f1" },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totBox: { width: 240, marginLeft: "auto", marginTop: 12 },
  words: { marginTop: 12, fontFamily: "Helvetica-Oblique" },
});

const Tot = ({ l, v, bold }: { l: string; v: string; bold?: boolean }) => (
  <View style={[s.totRow, bold ? { borderTopWidth: 1, borderTopColor: "#d2d4e6", paddingTop: 4 } : {}]}>
    <Text style={bold ? s.bold : s.muted}>{l}</Text><Text style={bold ? s.bold : undefined}>{v}</Text>
  </View>
);

export default function InvoiceDoc(p: InvoiceProps) {
  return (
    <Document title={`Invoice ${p.invoiceNo}`} author={p.agency}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {p.logo ? <Image src={p.logo} style={s.logo} /> : null}
            <View>
              <Text style={s.agency}>{p.agency}</Text>
              {p.gstAddress ? <Text style={s.muted}>{p.gstAddress}</Text> : null}
              {p.gstin ? <Text style={s.muted}>GSTIN: {p.gstin}{p.gstState ? ` · ${p.gstState}${p.gstStateCode ? ` (${p.gstStateCode})` : ""}` : ""}</Text> : null}
            </View>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={s.title}>TAX INVOICE</Text>
            <Text style={s.muted}>{p.invoiceNo}</Text>
            <Text style={s.muted}>{p.date}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 10 }}>
          <Text style={s.billLabel}>Bill to</Text>
          <Text style={s.bold}>{p.customerName}</Text>
          {p.customerContact ? <Text style={s.muted}>{p.customerContact}</Text> : null}
          <Text style={s.muted}>Trip: {p.tripName} · {p.pax} traveller{p.pax === 1 ? "" : "s"}</Text>
        </View>

        <View style={s.th}><Text style={{ flex: 3 }}>Description</Text><Text style={{ flex: 1 }}>SAC</Text><Text style={{ flex: 1, textAlign: "right" }}>Taxable value</Text></View>
        <View style={s.tr}><Text style={{ flex: 3 }}>Tour / travel package — {p.tripName}</Text><Text style={{ flex: 1 }}>{p.sacCode}</Text><Text style={{ flex: 1, textAlign: "right" }}>{p.taxable}</Text></View>
        {p.nonTaxNum > 0 ? <View style={s.tr}><Text style={{ flex: 3 }}>Other charges (non-taxable)</Text><Text style={{ flex: 1 }}>-</Text><Text style={{ flex: 1, textAlign: "right" }}>{p.nonTax}</Text></View> : null}

        <View style={s.totBox}>
          <Tot l="Taxable value" v={p.taxable} />
          <Tot l={`CGST @ ${p.gstHalfRate}%`} v={p.cgst} />
          <Tot l={`SGST @ ${p.gstHalfRate}%`} v={p.sgst} />
          <Tot l={`TCS @ ${p.tcsRate}%`} v={p.tcs} />
          {p.nonTaxNum > 0 ? <Tot l="Non-taxable" v={p.nonTax} /> : null}
          <Tot l="Total" v={p.total} bold />
          <Tot l="Received" v={`- ${p.paid}`} />
          <Tot l="Balance due" v={p.balance} bold />
        </View>

        <Text style={s.words}>Amount chargeable (in words): Rupees {p.amountWords} only.</Text>
        <Text style={[s.muted, { marginTop: 6 }]}>CGST/SGST shown assuming intra-state supply. {p.note || "This is a computer-generated invoice."}</Text>
        <Text style={[s.muted, { marginTop: 18, textAlign: "right" }]}>For {p.agency}</Text>
      </Page>
    </Document>
  );
}
