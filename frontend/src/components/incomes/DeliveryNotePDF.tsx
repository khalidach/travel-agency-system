// frontend/src/components/incomes/DeliveryNotePDF.tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Income, FacturationSettings } from "../../context/models";
import { numberToWordsFr } from "../../services/numberToWords";

// Register Inter font
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/inter-font@3.19.0/ttf/Inter-Regular.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/npm/inter-font@3.19.0/ttf/Inter-Bold.ttf', fontWeight: 700 },
    { src: 'https://cdn.jsdelivr.net/npm/inter-font@3.19.0/ttf/Inter-ExtraBold.ttf', fontWeight: 800 },
    // { src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/cyrillic-ext-400-normal.ttf', fontWeight: 400, fontStyle: 'italic' },

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
    justifyContent: 'center',
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
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
    textAlign: 'left',
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#000',
    justifyContent: 'center',
  },
  colAmount: {
    width: 100,
    textAlign: 'left',
    padding: 6,
    fontWeight: 'bold',
    justifyContent: 'center',
  },
  itemDate: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  totalsContainer: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
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

interface DeliveryNotePDFProps {
  income: Income;
  settings?: FacturationSettings;
  agencyName?: string;
}

export default function DeliveryNotePDF({ income, settings, agencyName }: DeliveryNotePDFProps) {
  const totalInWords = numberToWordsFr(income.amount || 0);

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
    <Document title={`Bon_de_Vente_${income.deliveryNoteNumber || income.id}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.agencyName}>{agencyName || "Votre Agence"}</Text>
          <Text style={styles.docType}>Bon de Vente</Text>
        </View>

        <View style={styles.clientBox}>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{income.client}</Text>
          </View>
          <View style={styles.docDetails}>
            <Text style={styles.docDetailsLabel}>N° : {income.deliveryNoteNumber || income.id}</Text>
            <Text style={styles.docDetailsValue}>Date : {new Date(income.date || new Date()).toLocaleDateString("fr-FR")}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDesignation}><Text>DÉSIGNATION</Text></View>
            <View style={styles.colQty}><Text>QTÉ</Text></View>
            <View style={styles.colPrice}><Text>P.U</Text></View>
            <View style={styles.colAmount}><Text>TOTAL</Text></View>
          </View>

          {(income.items as any[] || []).map((item, index) => (
            <View key={index} style={index === (income.items?.length || 0) - 1 ? styles.lastTableRow : styles.tableRow} wrap={false}>
              <View style={styles.colDesignation}>
                <Text>{item.description}</Text>
                {item.checkIn && item.checkOut && (
                  <Text style={styles.itemDate}>
                    Du {new Date(item.checkIn).toLocaleDateString("fr-FR")} au {new Date(item.checkOut).toLocaleDateString("fr-FR")}
                  </Text>
                )}
                {item.departureDate && item.returnDate && (
                  <Text style={styles.itemDate}>
                    Aller: {new Date(item.departureDate).toLocaleDateString("fr-FR")} | Retour: {new Date(item.returnDate).toLocaleDateString("fr-FR")}
                  </Text>
                )}
              </View>
              <View style={styles.colQty}>
                <Text>{item.quantity}</Text>
              </View>
              <View style={styles.colPrice}>
                <Text>
                  {((Number(item.prixUnitaire || item.unitPrice) || 0) + (Number(item.fraisServiceUnitaire) || 0)).toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View style={styles.colAmount}>
                <Text style={{ fontWeight: 'bold' }}>
                  {(Number(item.total) || 0).toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text>TOTAL A PAYER :</Text>
            <Text>{(Number(income.amount) || 0).toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} {income.currency || "MAD"}</Text>
          </View>
        </View>

        <View style={styles.wordsSection}>
          <Text style={styles.wordsLabel}>Arrêté le présent bon de Vente à la somme de :</Text>
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
