// frontend/src/components/facturation/FacturePDF.tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Facture, FacturationSettings } from "../../context/models";
import { numberToWordsFr } from "../../services/numberToWords";

// Register Inter font
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/inter-font@3.19.0/ttf/Inter-Regular.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/npm/inter-font@3.19.0/ttf/Inter-Bold.ttf', fontWeight: 700 },
    { src: 'https://cdn.jsdelivr.net/npm/inter-font@3.19.0/ttf/Inter-ExtraBold.ttf', fontWeight: 800 },
    // { src: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.2.8/files/inter-latin-400-italic.woff2', fontWeight: 400, fontStyle: 'italic' },
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  agencyName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  docType: {
    fontSize: 22,
    fontWeight: 800,
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  clientBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 80,
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientText: {
    fontSize: 10,
    color: '#4b5563',
    marginBottom: 2,
  },
  docDetails: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  docDetailsLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
  docDetailsValue: {
    fontSize: 12,
    color: '#374151',
    marginTop: 2,
  },
  table: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 200,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    flex: 1,
  },
  lastTableRow: {
    flexDirection: 'row',
    flex: 1,
  },
  colDesignation: {
    flex: 2,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#000',
    justifyContent: 'center',
  },
  colQty: {
    width: 50,
    textAlign: 'center',
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#000',
    justifyContent: 'center',
  },
  colPrice: {
    width: 100,
    textAlign: 'right',
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#000',
    justifyContent: 'center',
  },
  colAmount: {
    width: 100,
    textAlign: 'right',
    padding: 6,
    fontWeight: 'bold',
    justifyContent: 'center',
  },
  totalsContainer: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 4,
  },
  totalTTC: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#000',
    fontWeight: 800,
    fontSize: 12,
  },
  wordsSection: {
    marginTop: 30,
    // fontStyle: 'italic',
  },
  wordsLabel: {
    fontSize: 9,
    marginBottom: 4,
  },
  wordsValue: {
    fontWeight: 'bold',
    textTransform: 'capitalize',
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
  },
  footerContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
  }
});

interface FacturePDFProps {
  facture: Facture;
  settings?: FacturationSettings;
  agencyName?: string;
}

export default function FacturePDF({ facture, settings, agencyName }: FacturePDFProps) {
  const totalInWords = numberToWordsFr(facture.total || 0);
  const showMargin = facture.showMargin ?? true;
  const items = Array.isArray(facture.items) ? facture.items : [];

  const footerItems = [
    `Sté. ${agencyName || "Votre Agence"}`,
    settings?.address && `Siège : ${settings.address}`,
    settings?.phone && `Tél : ${settings.phone}`,
    settings?.email && `Email : ${settings.email}`,
    settings?.ice && `ICE : ${settings.ice}`,
    settings?.if && `IF : ${settings.if}`,
    settings?.rc && `RC : ${settings.rc}`,
    settings?.patente && `Patente : ${settings.patente}`,
    settings?.cnss && `CNSS : ${settings.cnss}`,
    settings?.bankName && settings?.rib && `RIB (${settings.bankName}) : ${settings.rib}`,
  ].filter(Boolean);

  return (
    <Document title={`${facture.type}_${facture.facture_number || facture.id}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.agencyName}>{agencyName || "Votre Agence"}</Text>
          <Text style={styles.docType}>{facture.type === "devis" ? "Devis" : "Facture"}</Text>
        </View>

        <View style={styles.clientBox}>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{facture.clientName || "Client inconnu"}</Text>
            <Text style={styles.clientText}>{facture.clientAddress || ""}</Text>
            {facture.clientICE && <Text style={styles.clientText}>ICE : {facture.clientICE || ""}</Text>}
          </View>
          <View style={styles.docDetails}>
            <Text style={styles.docDetailsLabel}>N° : {facture.facture_number || "Draft"}</Text>
            <Text style={styles.docDetailsValue}>Date : {facture.date ? new Date(facture.date).toLocaleDateString("fr-FR") : "Date non définie"}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDesignation}><Text>DÉSIGNATION</Text></View>
            <View style={styles.colQty}><Text>QTÉ</Text></View>
            <View style={styles.colPrice}><Text>Prix unitaire</Text></View>
            <View style={styles.colAmount}><Text>Montant</Text></View>
          </View>

          {items.map((item, index) => (
            <View key={index} style={index === items.length - 1 ? styles.lastTableRow : styles.tableRow} wrap={false}>
              <View style={styles.colDesignation}>
                <Text>{item.description || ""}</Text>
              </View>
              <View style={styles.colQty}>
                <Text>{String(item.quantity || 0)}</Text>
              </View>
              <View style={styles.colPrice}>
                <Text>{(Number(item.prixUnitaire) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.colAmount}>
                <Text style={{ fontWeight: 'bold' }}>{(Number(item.montant) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          {showMargin && (
            <View style={{ width: 200 }}>
              <View style={styles.totalRow}>
                <Text>Total Hors Frais :</Text>
                <Text>{(Number(facture.prixTotalHorsFrais) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>Frais Service HT :</Text>
                <Text>{(Number(facture.totalFraisServiceHT) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>TVA (20%) :</Text>
                <Text>{(Number(facture.tva) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH</Text>
              </View>
            </View>
          )}
          <View style={styles.totalTTC}>
            <Text>TOTAL TTC :</Text>
            <Text>{(Number(facture.total) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH</Text>
          </View>
        </View>

        <View style={styles.wordsSection}>
          <Text style={styles.wordsLabel}>Arrêté la présente facture à la somme de :</Text>
          <Text style={styles.wordsValue}>{totalInWords}</Text>
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerContent}>
            {footerItems.map((item, idx) => (
              <Text key={idx}>{idx > 0 ? `| ${item} ` : `${item} `}</Text>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}
