
'use client';
import type { QuotationFormValues } from "@/lib/types";

export const QuotationPrintTemplate = ({ quotation, subtotal, tax, grandTotal, quoteNumber }: { quotation: QuotationFormValues, subtotal: number, tax: number, grandTotal: number, quoteNumber: string }) => {
    const addressLine1 = [quotation.customerAddress?.line1, quotation.customerAddress?.line2].filter(Boolean).join(', ');
    const addressLine2 = [quotation.customerAddress?.city, quotation.customerAddress?.state, quotation.customerAddress?.zipcode].filter(Boolean).join(', ');

    return (
        <div id="quotation-to-print" className="p-10" style={{ width: '800px', fontFamily: 'Inter, sans-serif', color: '#111827', backgroundColor: 'white', fontSize: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#6b7280', marginBottom: '20px' }}>
            <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            <span>Business Quotation</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
               <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ height: '40px', width: '40px' }}>
                  <g transform="translate(50,50)">
                    <path d="M0,0 L50,0 A50,50 0 0,0 25,-43.3 Z" fill="hsl(var(--chart-1))" transform="rotate(0)" />
                    <path d="M0,0 L50,0 A50,50 0 0,0 25,-43.3 Z" fill="hsl(var(--chart-2))" transform="rotate(60)" />
                    <path d="M0,0 L50,0 A50,50 0 0,0 25,-43.3 Z" fill="hsl(var(--chart-3))" transform="rotate(120)" />
                    <path d="M0,0 L50,0 A50,50 0 0,0 25,-43.3 Z" fill="hsl(var(--chart-4))" transform="rotate(180)" />
                    <path d="M0,0 L50,0 A50,50 0 0,0 25,-43.3 Z" fill="hsl(var(--primary))" transform="rotate(240)" />
                    <path d="M0,0 L50,0 A50,50 0 0,0 25,-43.3 Z" fill="hsl(var(--chart-5))" transform="rotate(300)" />
                  </g>
                </svg>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#000', margin: 0 }}>PHBKT Group Limited</h1>
                <p style={{ margin: '2px 0', fontSize: '10px' }}>North Main Road, Koregaon Park</p>
                <p style={{ margin: '2px 0', fontSize: '10px' }}>Pune, Maharashtra 414501.</p>
                <p style={{ margin: '2px 0', fontSize: '10px' }}>Email: contact@phbkt.com | Phone: +91 7972688626</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: 700, color: '#374151' }}>QUOTATION</h2>
              <p style={{ margin: '2px 0', fontSize: '10px', fontWeight: 500 }}><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              <p style={{ margin: '2px 0', fontSize: '10px', fontWeight: 500 }}><strong>Quote #:</strong> {quoteNumber}</p>
              <p style={{ margin: '2px 0', fontSize: '10px', fontWeight: 500 }}><strong>Valid Until:</strong> {(() => { const d = new Date(); d.setDate(d.getDate() + 15); return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); })()}</p>
            </div>
          </div>
          <div style={{ padding: '20px 0' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '10px', fontWeight: 700, color: '#374151' }}>Quotation For:</h3>
            <p style={{ margin: '2px 0', fontWeight: 'bold' }}>{quotation.customerName}</p>
            {quotation.customerBusinessName && <p style={{ margin: '2px 0' }}>{quotation.customerBusinessName}</p>}
            {addressLine1 && <p style={{ margin: '2px 0' }}>{addressLine1}</p>}
            {addressLine2 && <p style={{ margin: '2px 0' }}>{addressLine2}</p>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: 700 }}>Item</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: 700 }}>Description</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>Quantity</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>Unit Price (₹)</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {quotation.tasks.map((task, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px', verticalAlign: 'top' }}>
                    <p style={{ fontWeight: 700, margin: 0 }}>{task.item}</p>
                  </td>
                  <td style={{ padding: '10px', verticalAlign: 'top' }}>
                    <p style={{ color: '#6b7280', margin: 0 }}>{task.description || ''}</p>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>{task.quantity}</td>
                  <td style={{ padding: '10px', textAlign: 'right', verticalAlign: 'top' }}>₹{(task.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '10px', textAlign: 'right', verticalAlign: 'top' }}>₹{((task.quantity || 0) * (task.unitPrice || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <table style={{ width: '40%' }}>
              <tbody>
                <tr><td style={{ padding: '5px 0' }}>Subtotal:</td><td style={{ padding: '5px 0', textAlign: 'right' }}>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                <tr><td style={{ padding: '5px 0' }}>Tax (18% GST):</td><td style={{ padding: '5px 0', textAlign: 'right' }}>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                <tr style={{ fontWeight: 700, fontSize: '12px' }}><td style={{ paddingTop: '10px', borderTop: '2px solid #111827' }}>TOTAL:</td><td style={{ paddingTop: '10px', borderTop: '2px solid #111827', textAlign: 'right' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
              </tbody>
            </table>
          </div>
           <div style={{ marginTop: '40px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
            <h4 style={{ margin: '0 0 10px', fontWeight: 700 }}>Terms &amp; Conditions</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
              <li>50% advance payment is required to start the project.</li>
              <li>The remaining 50% is due upon project completion, before final delivery.</li>
              <li>This quotation is valid for 15 days from the date of issue.</li>
              <li>Any changes or additions to the scope of work may incur additional charges.</li>
            </ul>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px' }}>
            <div style={{ width: '45%' }}>
              <div style={{ borderTop: '1px solid #111827', paddingTop: '8px' }}>
                <p style={{ margin: 0 }}>Authorized Signature</p>
                <p style={{ margin: '2px 0', color: '#6b7280' }}>PHBKT Group Limited</p>
              </div>
            </div>
            <div style={{ width: '45%' }}>
              <div style={{ borderTop: '1px solid #111827', paddingTop: '8px' }}>
                <p style={{ margin: 0 }}>Client Signature</p>
                <p style={{ margin: '2px 0', color: '#6b7280' }}>{quotation.customerName}</p>
              </div>
            </div>
          </div>
        </div>
    );
}
