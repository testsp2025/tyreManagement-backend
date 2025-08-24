// Using isomorphic-fetch for Node.js compatibility
const fetch = require('isomorphic-fetch');

async function sendOrderEmail(supplier, request, orderNotes = '', orderNumber = '') {
  try {
    console.log(`Sending order email to supplier: ${supplier.name} (${supplier.email})`);
    
    // Create email subject
    const emailSubject = `🚛 SLT Mobitel Tire Order - ${orderNumber}`;

    // Create a professional email template
    const orderDetails = `
Dear ${supplier.name},

We trust this email finds you well. As a valued supplier of SLT Mobitel, we are pleased to submit this official tire order request for our fleet maintenance requirements.

Purchase Order Details:
Order Reference: ${orderNumber}
Internal Request ID: ${request.id}
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Vehicle Information:
Registration Number: ${request.vehicleNumber}
Make/Model: ${request.vehicleBrand} ${request.vehicleModel}

Required Products:
• Tire Specification: ${request.tireSizeRequired}
• Required Quantity: ${request.quantity} tire(s)${request.tubesQuantity > 0 ? ` with ${request.tubesQuantity} tube(s)` : ''}

Delivery Information:
${request.deliveryOfficeName ? request.deliveryOfficeName : ''}
${request.deliveryStreetName ? request.deliveryStreetName : ''}
${request.deliveryTown ? request.deliveryTown : ''}

${orderNotes ? `Special Requirements:\n${orderNotes}\n\n` : ''}For this order, we kindly request a detailed quotation including:

1. Unit pricing for the specified tires and tubes
2. Expected delivery timeframe
3. Applicable warranty coverage details
4. Available payment terms and options
5. Any current promotional offers or fleet discounts

As a long-term partner of SLT Mobitel, your competitive pricing and quality service have been invaluable to our operations. We look forward to maintaining this mutually beneficial relationship.

Authorized Contact Person:
${request.requesterName}
${request.userSection}
SLT Mobitel
Direct Line: ${request.requesterPhone}
Email: ${request.requesterEmail}

Please acknowledge receipt of this order request. We anticipate your comprehensive quotation at your earliest convenience, preferably within the next 2-3 business days.

Thank you for your continued support and professional service.

Best regards,

${request.requesterName}
Fleet Management Department
SLT Mobitel
`;


    // Handle different formats of formsfree_key
    let formspreeUrl = supplier.formsfree_key.trim();

    // If it's already a full URL, use it directly
    if (formspreeUrl.startsWith('https://formspree.io/f/')) {
      // Already in correct format
    } else if (formspreeUrl.startsWith('http')) {
      // Some other URL format, extract the form ID
      const match = formspreeUrl.match(/\/f\/([a-zA-Z0-9]+)/);
      if (match) {
        formspreeUrl = `https://formspree.io/f/${match[1]}`;
      } else {
        throw new Error('Invalid Formspree URL format');
      }
    } else {
      // Just the form ID, construct the full URL
      formspreeUrl = `https://formspree.io/f/${formspreeUrl}`;
    }

    console.log('Sending to Formspree URL:', formspreeUrl);
    console.log('Supplier details:', {
      name: supplier.name,
      email: supplier.email,
      formsfree_key: supplier.formsfree_key
    });

    // Debug order notes
    console.log('Order notes received:', {
      orderNotes: orderNotes,
      type: typeof orderNotes,
      length: orderNotes ? orderNotes.length : 0,
      trimmed: orderNotes ? orderNotes.trim() : 'null/undefined'
    });

    // Check if we should include notes
    const shouldIncludeNotes = orderNotes &&
                              orderNotes.trim() !== '' &&
                              orderNotes.trim().toLowerCase() !== 'ok' &&
                              orderNotes.trim() !== 'N/A' &&
                              orderNotes.trim() !== 'None';

    console.log('Should include notes:', shouldIncludeNotes);

    // Create simple delivery paragraph
    let deliveryParagraph = '';

    // Check if any delivery fields exist
    if (request.deliveryOfficeName || request.deliveryStreetName || request.deliveryTown) {
      const deliveryParts = [];

      if (request.deliveryOfficeName) {
        deliveryParts.push(request.deliveryOfficeName);
      }
      if (request.deliveryStreetName) {
        deliveryParts.push(request.deliveryStreetName);
      }
      if (request.deliveryTown) {
        deliveryParts.push(request.deliveryTown);
      }

      if (deliveryParts.length > 0) {
        deliveryParagraph = `\n\nPlease arrange delivery to: ${deliveryParts.join(', ')}.`;
      }
    }

    // Create a beautiful professional business letter format
    const professionalMessage = `
Dear ${supplier.name},

I hope this message finds you well. This is an official tire order from SLT Mobitel.

Order Number: ${orderNumber}
Request ID: ${request.id}

Product Details:
• Vehicle Number: ${request.vehicleNumber}
• Tire Size Required: ${request.tireSizeRequired}
• Quantity: ${request.quantity} tire${request.quantity > 1 ? 's' : ''}${request.tubesQuantity > 0 ? ` and ${request.tubesQuantity} tube${request.tubesQuantity > 1 ? 's' : ''}` : ''}${deliveryParagraph}

${shouldIncludeNotes ? `Additional Requirements: ${orderNotes.trim()}\n\n` : ''}We would greatly appreciate if you could provide us with your most competitive pricing along with your delivery schedule and terms of service.

Thank you for your continued partnership. We look forward to your prompt response.

Best regards,
${request.requesterName}
${request.userSection}
SLT Mobitel

Contact Details:
Phone: ${request.requesterPhone}
Email: ${request.requesterEmail}`.trim();

    // Prepare the email payload for Formspree - only the essential message
    const formspreePayload = {
      email: supplier.email,
      subject: emailSubject,
      message: professionalMessage
    };

    console.log('Final email message being sent:');
    console.log('=================================');
    console.log(professionalMessage);
    console.log('=================================');

    console.log('Formspree payload keys:', Object.keys(formspreePayload));

    const response = await fetch(formspreeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(formspreePayload)
    });

    console.log('Formspree response status:', response.status);
    console.log('Formspree response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Formspree error response:', errorText);
      console.error('Formspree error status:', response.status);
      console.error('Formspree error statusText:', response.statusText);

      // Try to parse error as JSON if possible
      let errorDetails = errorText;
      try {
        errorDetails = JSON.parse(errorText);
      } catch (e) {
        // Keep as text if not JSON
      }

      throw new Error(`Formspree API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorDetails)}`);
    }

    const result = await response.json();
    console.log('Order email sent successfully:', result);
    
    return {
      success: true,
      message: 'Order email sent successfully',
      supplier: supplier.name,
      email: supplier.email,
      formsfree_response: result
    };

  } catch (error) {
    console.error('Error sending order email:', error);
    throw new Error(`Failed to send order email: ${error.message}`);
  }
}

module.exports = {
  sendOrderEmail
};
