import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type ReceiptProps = {
  agency: string;
  gstAddress?: string | null;
  gstin?: string | null;
  receiptNo: string;
  date: string;
  customerName: string;
  tripName: string;
  mode: string;
  note?: string | null;
  amount: string;
  amountWords: string;
  total: string;
  paidToDate: string;
  balance: string;
  asOf: string;
};

const s = StyleSheet.create({
  page: { padding: 42, fontSize: 10, fontFamily: "Helvetica", color: "#1b1c2b" },
  agency: { fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "center" },
  sub: { textAlign: "center", color: "#5a5d74", fontSize: 9, marginTop: 2 },
  title: { marginTop: 12, fontSize: 11, fontFamily: "Helvetica-Bold", letterSpacing: 2, textAlign: "center" },
  rule: { borderBottomWidth: 2, borderBottomColor: "#d2d4e6", marginTop: 12, marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e6e7f1" },
  label: { color: "#5a5d74" },
  bold: { fontFamily: "Helvetica-Bold" },
  words: { marginTop: 14, marginBottom: 16, fontFamily: "Helvetica-Oblique" },
  box: { backgroundColor: "#f6f7fc", padding: 12 },
  boxRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  footer: { marginTop: 26, textAlign: "center", color: "#5a5d74", fontSize: 9 },
});

const Row = ({ l, v, bold }: { l: string; v: string; bold?: boolean }) => (
  <View style={s.row}>
    <Text style={s.label}>{l}</Text>
    <Text style={bold ? s.bold : undefined}>{v}</Text>
  </View>
);

export default function ReceiptDoc(p: ReceiptProps) {
  return (
    <Document title={`Receipt ${p.receiptNo}`} author={p.agency}>
      <Page size="A4" style={s.page}>
        <Text style={s.agency}>{p.agency}</Text>
        {p.gstAddress ? <Text style={s.sub}>{p.gstAddress}</Text> : null}
        {p.gstin ? <Text style={s.sub}>GSTIN: {p.gstin}</Text> : null}
        <Text style={s.title}>PAYMENT RECEIPT</Text>
        <View style={s.rule} />

        <Row l="Receipt no." v={p.receiptNo} />
        <Row l="Receipt date" v={p.date} />
        <Row l="Received from" v={p.customerName} />
        <Row l="Towards" v={p.tripName} />
        <Row l="Payment mode" v={p.mode} />
        {p.note ? <Row l="Reference / note" v={p.note} /> : null}
        <Row l="Amount received" v={p.amount} bold />

        <Text style={s.words}>Rupees {p.amountWords} only.</Text>

        <View style={s.box}>
          <View style={s.boxRow}><Text style={s.label}>Total invoiced</Text><Text>{p.total}</Text></View>
          <View style={s.boxRow}><Text style={s.label}>Received up to {p.asOf}</Text><Text>{p.paidToDate}</Text></View>
          <View style={[s.boxRow, { marginBottom: 0 }]}><Text style={s.bold}>Balance as on {p.asOf}</Text><Text style={s.bold}>{p.balance}</Text></View>
        </View>

        <Text style={s.footer}>Thank you for your payment. This is a computer-generated receipt and does not require a signature.</Text>
      </Page>
    </Document>
  );
}
