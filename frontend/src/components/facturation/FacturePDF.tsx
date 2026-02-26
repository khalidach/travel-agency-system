// frontend/src/components/facturation/FacturePDF.tsx
import { useQuery } from "@tanstack/react-query";
import * as api from "../../services/api";
import { Facture, FacturationSettings } from "../../context/models";
import { useAuthContext } from "../../context/AuthContext";
import { numberToWordsFr } from "../../services/numberToWords";

interface FacturePDFProps {
  facture: Facture;
}

export default function FacturePDF({ facture }: FacturePDFProps) {
  const { data: settings } = useQuery<FacturationSettings>({
    queryKey: ["settings"],
    queryFn: api.getSettings,
  });
  const { state: authState } = useAuthContext();

  const totalInWords = numberToWordsFr(facture.total);
  const showMargin = facture.showMargin ?? true; // Default to true for older invoices

  return (
    <div
      className="pdf-container"
      style={{
        width: "210mm",
        minHeight: "297mm",
        backgroundColor: "white",
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Styles critiques pour le moteur de rendu PDF */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
          
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 0; size: A4; }
          }
          .pdf-container { box-sizing: border-box; line-height: 1.5; color: #111827; }
          .pdf-container * { box-sizing: border-box; }
          
          /* Layout */
          .pdf-container .flex { display: flex; }
          .pdf-container .flex-col { flex-direction: column; }
          .pdf-container .flex-grow { flex-grow: 1; }
          .pdf-container .justify-between { justify-content: space-between; }
          .pdf-container .justify-center { justify-content: center; }
          .pdf-container .justify-end { justify-content: flex-end; }
          .pdf-container .items-center { align-items: center; }
          .pdf-container .items-start { align-items: flex-start; }
          .pdf-container .items-end { align-items: flex-end; }
          .pdf-container .flex-wrap { flex-wrap: wrap; }
          
          /* Spacing */
          .pdf-container .mb-1 { margin-bottom: 4px; }
          .pdf-container .mb-2 { margin-bottom: 8px; }
          .pdf-container .mb-4 { margin-bottom: 16px; }
          .pdf-container .mb-8 { margin-bottom: 32px; }
          .pdf-container .mt-1 { margin-top: 4px; }
          .pdf-container .mt-2 { margin-top: 8px; }
          .pdf-container .mt-4 { margin-top: 16px; }
          .pdf-container .p-2 { padding: 8px; }
          .pdf-container .p-4 { padding: 16px; }
          .pdf-container .pt-2 { padding-top: 8px; }
          .pdf-container .gap-2 { gap: 8px; }
          .pdf-container .gap-4 { gap: 16px; }
          
          /* Typography */
          .pdf-container .text-right { text-align: right; }
          .pdf-container .text-center { text-align: center; }
          .pdf-container .uppercase { text-transform: uppercase; }
          .pdf-container .font-bold { font-weight: 700; }
          .pdf-container .font-medium { font-weight: 500; }
          .pdf-container .text-sm { font-size: 14px; }
          .pdf-container .text-xs { font-size: 12px; }
          .pdf-container .italic { font-style: italic; }
          
          /* Tables */
          .pdf-container table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .pdf-container th, .pdf-container td { padding: 12px 8px; border-bottom: 1px solid #e5e7eb; }
          .pdf-container tr { page-break-inside: avoid; }
        `}
      </style>

      <div className="flex-grow">
        {/* HEADER - Logo and Document Type only */}
        <header>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                }}
              >
                {authState.user?.agencyName || "Votre Agence"}
              </h1>
            </div>

            <div className="flex flex-col items-end text-right">
              <h2
                className="uppercase"
                style={{
                  fontSize: "24px",
                  fontWeight: "900",
                  color: "#2563eb",
                }}
              >
                {facture.type === "devis" ? "Devis" : "Facture"}
              </h2>
            </div>
          </div>
        </header>

        {/* BODY - Client Info, Facture Number and Date in a shared bordered box */}
        <main>
          {facture.clientName && (
            <div
              className="flex justify-between items-start"
              style={{
                marginBottom: "30px",
                padding: "20px",
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                marginTop: "100px",
              }}
            >
              {/* Left: Client Information */}
              <div className="flex flex-col justify-center " style={{ justifyContent: "center" }}>
                <p
                  style={{
                    fontWeight: "bold",
                    fontSize: "14px",
                    marginBottom: "4px",
                  }}
                >
                  {facture.clientName}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#4b5563",
                  }}
                >
                  {facture.clientAddress}
                </p>
                {facture.clientICE && (
                  <p
                    style={{
                      fontSize: "11px",
                      marginTop: "4px",
                    }}
                  >
                    ICE : {facture.clientICE}
                  </p>
                )}
              </div>

              {/* Right: Document Number and Date */}
              <div className="flex flex-col items-end justify-center text-right" style={{ justifyContent: "center" }}>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "#111827",
                  }}
                >
                  N° : {facture.facture_number}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#374151",
                    marginTop: "4px",
                  }}
                >
                  Date : {new Date(facture.date).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          )}

          {!facture.clientName && (
            <div className="flex justify-end mb-8">
              {/* Document Number and Date when no client info */}
              <div className="flex flex-col items-end text-right">
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "#111827",
                  }}
                >
                  N° : {facture.facture_number}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#374151",
                    marginTop: "4px",
                  }}
                >
                  Date : {new Date(facture.date).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          )}

          <table
            style={{
              minHeight: "300px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#f3f4f6",
                }}
              >
                <th
                  style={{
                    textAlign: "left",
                    border: "1px solid #000",
                  }}
                >
                  DÉSIGNATION
                </th>
                <th
                  style={{
                    textAlign: "center",
                    width: "60px",
                    border: "1px solid #000",
                  }}
                >
                  QTÉ
                </th>
                <th
                  style={{
                    textAlign: "left",
                    border: "1px solid #000",
                  }}
                >
                  P.U
                </th>
                {showMargin && (
                  <th
                    style={{
                      textAlign: "left",
                      border: "1px solid #000",
                    }}
                  >
                    Frais SERV.
                  </th>
                )}
                <th
                  style={{
                    textAlign: "left",
                    border: "1px solid #000",
                  }}
                >
                  TOTAL TTC
                </th>
              </tr>
            </thead>
            <tbody>
              {facture.items.map((item, index) => (
                <tr key={index}>
                  <td
                    style={{
                      whiteSpace: "pre-wrap",
                      border: "1px solid #000",
                    }}
                  >
                    {item.description}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      border: "1px solid #000",
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      textAlign: "left",
                      border: "1px solid #000",
                    }}
                  >
                    {(Number(item.prixUnitaire) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {showMargin && (
                    <td
                      style={{
                        textAlign: "left",
                        border: "1px solid #000",
                      }}
                    >
                      {(Number(item.fraisServiceUnitaire) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  )}
                  <td
                    style={{
                      textAlign: "left",
                      fontWeight: "bold",
                      border: "1px solid #000",
                    }}
                  >
                    {(Number(item.total) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALS */}
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <div style={{ width: "250px" }}>
              {showMargin && (
                <>
                  <div className="flex justify-between mt-1 text-sm">
                    <span>Total Hors Frais :</span>
                    <span>
                      {(Number(facture.prixTotalHorsFrais) || 0).toLocaleString(
                        'de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}{" "}
                      DH
                    </span>
                  </div>
                  <div className="flex justify-between mt-1 text-sm">
                    <span>Frais Service HT :</span>
                    <span>
                      {(Number(facture.totalFraisServiceHT) || 0).toLocaleString(
                        'de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}{" "}
                      DH
                    </span>
                  </div>
                  <div className="flex justify-between mt-1 text-sm">
                    <span>TVA (20%) :</span>
                    <span>
                      {(Number(facture.tva) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                      DH
                    </span>
                  </div>
                </>
              )}
              <div
                className="flex justify-between mt-2 pt-2"
                style={{
                  borderTop: "2px solid #000",
                  fontWeight: "900",
                  fontSize: "14px",
                }}
              >
                <span>TOTAL TTC :</span>
                <span>
                  {(Number(facture.total) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  DH
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "40px",
              fontStyle: "italic",
            }}
          >
            <p
              style={{
                fontSize: "11px",
              }}
            >
              Arrêté la présente facture à la somme de :
            </p>
            <p
              style={{
                fontWeight: "bold",
                textTransform: "capitalize",
              }}
            >
              {totalInWords}
            </p>
            {!showMargin && (
              <p
                style={{
                  fontWeight: "bold",
                  marginTop: "16px",
                  fontSize: "11px",
                }}
              >
                Régime particulier – agences de voyages
              </p>
            )}
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid #eee",
          paddingTop: "20px",
        }}
      >
        <div
          className="flex gap-2 justify-center flex-wrap"
          style={{ fontSize: "12px", color: "#6b7280", textAlign: "center" }}
        >
          {[
            `Sté. ${authState.user?.agencyName || "Votre Agence"}`,
            settings?.address && `Siège : ${settings.address}`,
            settings?.phone && `Tél : ${settings.phone}`,
            settings?.email && `Email : ${settings.email}`,
            settings?.ice && `ICE : ${settings.ice}`,
            settings?.if && `IF : ${settings.if}`,
            settings?.rc && `RC : ${settings.rc}`,
            settings?.patente && `Patente : ${settings.patente}`,
            settings?.cnss && `CNSS : ${settings.cnss}`,
            settings?.bankName &&
            settings?.rib &&
            `RIB (${settings.bankName}) : ${settings.rib}`,
          ]
            .filter(Boolean)
            .map((item, idx) => (
              <p key={idx}>{idx > 0 ? `| ${item}` : item}</p>
            ))}
        </div>
      </footer>
    </div>
  );
}
