const RequestImage = require("../models/RequestImage");
const { Request } = require("../models");
const { sequelize } = require("../config/db");
const { pool } = require("../config/db");
const { sendOrderEmail } = require("../utils/orderEmailService");
const { Op } = require('sequelize');

// Helper function to validate date format
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};
// const websocketService = require("../services/websocketService"); // Disabled
// const sseRoutes = require("../routes/sseRoutes"); // Disabled

exports.createRequest = async (req, res) => {
  try {
    const requestData = req.body;

    // Convert numeric fields from string to number
    requestData.vehicleId = Number(requestData.vehicleId);
    requestData.quantity = Number(requestData.quantity);
    requestData.tubesQuantity = Number(requestData.tubesQuantity);
    requestData.presentKmReading = Number(requestData.presentKmReading);
    requestData.previousKmReading = Number(requestData.previousKmReading);
    requestData.userId = Number(requestData.userId);

    // Validate required fields
    const requiredFields = [
      "userId",
      "vehicleId",
      "vehicleNumber",
      "quantity",
      "tubesQuantity",
      "tireSize",
      "requestReason",
      "requesterName",
      "requesterEmail",
      "requesterPhone",
      "vehicleBrand",
      "vehicleModel",
      "lastReplacementDate",
      "existingTireMake",
      "tireSizeRequired",
      "presentKmReading",
      "previousKmReading",
      "tireWearPattern",
      "userSection",
      "costCenter",
    ];
    for (const field of requiredFields) {
      if (
        requestData[field] === undefined ||
        requestData[field] === null ||
        requestData[field] === ""
      ) {
        return res
          .status(400)
          .json({ error: `Missing required field: ${field}` });
      }
    }

    // Additional validation for phone number (max 10 digits, no leading zeros)
    if (requestData.requesterPhone) {
      const phoneDigits = requestData.requesterPhone.replace(/\D/g, '');
      if (phoneDigits.length === 0) {
        return res
          .status(400)
          .json({ error: "Phone number is required" });
      }
      if (phoneDigits.length > 10) {
        return res
          .status(400)
          .json({ error: "Phone number cannot exceed 10 digits" });
      }
      if (phoneDigits.startsWith('0')) {
        return res
          .status(400)
          .json({ error: "Phone number cannot start with zero" });
      }
      if (!/^\d+$/.test(phoneDigits)) {
        return res
          .status(400)
          .json({ error: "Phone number must contain only digits" });
      }
      // Note: Leading zeros are automatically removed on frontend
    }

    // Check for duplicate/recent requests for the same vehicle
    const existingRequests = await Request.findAll({
      where: {
        vehicleNumber: requestData.vehicleNumber,
        status: {
          [require('sequelize').Op.notIn]: ['rejected', 'complete', 'order placed']
        }
      },
      order: [['submittedAt', 'DESC']]
    });

    // Check for pending requests
    if (existingRequests.length > 0) {
      return res.status(400).json({
        error: `Vehicle ${requestData.vehicleNumber} already has a pending tire request. Please wait for the current request to be processed before submitting a new one.`,
        existingRequestId: existingRequests[0].id,
        existingRequestStatus: existingRequests[0].status
      });
    }

    // Check for recent completed requests (within 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCompletedRequests = await Request.findAll({
      where: {
        vehicleNumber: requestData.vehicleNumber,
        status: {
          [require('sequelize').Op.in]: ['complete', 'order placed']
        },
        submittedAt: {
          [require('sequelize').Op.gte]: thirtyDaysAgo
        }
      },
      order: [['submittedAt', 'DESC']]
    });

    if (recentCompletedRequests.length > 0) {
      const lastRequest = recentCompletedRequests[0];
      const daysSinceLastRequest = Math.ceil((new Date() - new Date(lastRequest.submittedAt)) / (1000 * 60 * 60 * 24));
      return res.status(400).json({
        error: `Vehicle ${requestData.vehicleNumber} had a tire request completed ${daysSinceLastRequest} days ago. Please wait at least 30 days between tire requests for the same vehicle.`,
        lastRequestDate: lastRequest.submittedAt,
        daysRemaining: 30 - daysSinceLastRequest
      });
    }

    // 1. Create the request
    const result = await Request.create(requestData);

    // 2. Save image URLs in request_images table
    if (Array.isArray(requestData.images)) {
      for (let i = 0; i < requestData.images.length; i++) {
        const imageUrl = requestData.images[i];
        if (imageUrl) {
          await RequestImage.create({
            requestId: result.id,
            imagePath: imageUrl,
            imageIndex: i,
          });
        }
      }
    }

    const fullRequest = await Request.findByPk(result.id);
    res.status(201).json(fullRequest);
  } catch (err) {
    console.error("Error creating tire request:", err);
    res.status(500).json({ error: "Failed to create tire request" });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    // Use raw SQL to join with vehicles table to get department information
    const [requests] = await pool.query(`
      SELECT
  r.*
FROM requests r
ORDER BY r.submittedAt DESC
    `);

    // Fetch images for each request
    const requestsWithImages = await Promise.all(
      requests.map(async (request) => {
        const images = await RequestImage.findAll({
          where: { requestId: request.id },
          order: [["imageIndex", "ASC"]],
        });
        const imageUrls = images.map((img) => img.imagePath);

        // Only use actual department information, don't add defaults
        const departmentInfo = {
          ...request,
          userSection: request.userSection || null,
          costCenter: request.costCenter || null,
          images: imageUrls,
        };

        return departmentInfo;
      })
    );

    res.json(requestsWithImages);
  } catch (error) {
    console.error("Error in getAllRequests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getRequestById = async (req, res) => {
  try {
    // Fetch the request
    const request = await Request.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Fetch related images
    const images = await RequestImage.findAll({
      where: { requestId: req.params.id },
      order: [["imageIndex", "ASC"]],
    });

    // Map image paths to an array of URLs
    const imageUrls = images.map((img) => img.imagePath);

    // Add images to the response
    res.json({ ...request.toJSON(), images: imageUrls });
  } catch (error) {
    console.error("Error in getRequestById:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateRequest = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData = req.body;

    const request = await Request.findByPk(id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    await request.update(updateData);
    return res.json(request);
  } catch (error) {
    console.error("Error updating request:", error);
    return res.status(500).json({ message: "Error updating request", error: error.message });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { status, notes, role, userId } = req.body;

    // Allow all valid statuses from your enum
    const allowedStatuses = [
      "pending",
      "supervisor approved",
      "technical-manager approved",
      "engineer approved",
      "customer-officer approved",
      "approved",
      "rejected",
      "supervisor rejected",
      "technical-manager rejected",
      "engineer rejected",
      "customer-officer rejected",
      "complete",
      "order placed",
      "order cancelled",
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Find the request by primary key
    const request = await Request.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    console.log(
      "Found request:",
      request.id,
      "current status:",
      request.status
    );
    console.log("Updating to status:", status, "with role:", req.body.role);

    request.status = status;

    // Save notes to the correct column
    if (
      status === "supervisor approved" ||
      status === "supervisor rejected"
    ) {
      request.supervisor_notes = notes;
      // Store the supervisor ID who made the decision
      if (userId) {
        request.supervisor_decision_by = userId;
      }
    }
    if (
      status === "technical-manager approved" ||
      status === "technical-manager rejected"
    ) {
      request.technical_manager_note = notes;
      // Store the technical manager ID who made the decision
      if (userId) {
        request.technical_manager_id = userId;
      }
    }
    if (
      status === "engineer approved" ||
      status === "complete" ||
      status === "engineer rejected"
    ) {
      request.engineer_note = notes;
      // Store the engineer ID who made the decision
      if (userId) {
        request.engineer_decision_by = userId;
      }
    }
    if (
      status === "customer-officer approved" ||
      status === "order placed" ||
      status === "order cancelled" ||
      status === "customer-officer rejected"
    ) {
      request.customer_officer_note = notes;
      // Store the customer officer ID who made the decision
      if (userId) {
        request.customer_officer_decision_by = userId;
      }
    }

    console.log("Attempting to save request with status:", status);
    console.log("Request data before save:", {
      id: request.id,
      status: request.status,
      supervisor_notes: request.supervisor_notes,
      technical_manager_note: request.technical_manager_note,
      engineer_note: request.engineer_note,
    });

    try {
      await request.save();
      console.log("Request saved successfully with Sequelize");
    } catch (sequelizeError) {
      console.log(
        "Sequelize save failed, trying raw SQL:",
        sequelizeError.message
      );

      // Fallback to raw SQL update
      let updateQuery = "UPDATE requests SET status = ?";
      let params = [status];

      if (
        status === "supervisor approved" ||
        status === "supervisor rejected"
      ) {
        updateQuery += ", supervisor_notes = ?";
        params.push(notes);
      }
      if (
        status === "technical-manager approved" ||
        status === "technical-manager rejected"
      ) {
        updateQuery += ", technical_manager_note = ?";
        params.push(notes);
      }
      if (
        status === "engineer approved" ||
        status === "complete" ||
        status === "engineer rejected"
      ) {
        updateQuery += ", engineer_note = ?";
        params.push(notes);
      }
      if (
        status === "customer-officer approved" ||
        status === "order placed" ||
        status === "order cancelled" ||
        status === "customer-officer rejected"
      ) {
        updateQuery += ", customer_officer_note = ?";
        params.push(notes);
      }

      updateQuery += " WHERE id = ?";
      params.push(req.params.id);

      console.log("Executing raw SQL:", updateQuery, params);
      await pool.query(updateQuery, params);
      console.log("Raw SQL update successful");
    }

    // Fetch the updated request
    const updatedRequest = await Request.findByPk(req.params.id);

    // Real-time updates disabled - using polling only
    // websocketService.broadcastRequestUpdate(updatedRequest, "updated");

    // SSE disabled due to Railway connection issues
    // sseRoutes.broadcastUpdate({
    //   type: "REQUEST_UPDATE",
    //   action: "updated",
    //   request: updatedRequest,
    //   timestamp: new Date().toISOString(),
    // });

    res.json({
      message: "Request status updated successfully",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating request status:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      sql: error.sql,
    });
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
      sql: error.sql,
    });
  }
};

exports.getRequestsByUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Use raw SQL to join with vehicles table to get department information
    const [requests] = await pool.query(
      `
      SELECT
  r.*
FROM requests r
ORDER BY r.submittedAt DESC
    `,
      [userId]
    );

    // Fetch images for each request
    const requestsWithImages = await Promise.all(
      requests.map(async (request) => {
        const images = await RequestImage.findAll({
          where: { requestId: request.id },
          order: [["imageIndex", "ASC"]],
        });
        const imageUrls = images.map((img) => img.imagePath);

        // Only use actual department information, don't add defaults
        const departmentInfo = {
          ...request,
          userSection: request.userSection || null,
          costCenter: request.costCenter || null,
          images: imageUrls,
        };

        return departmentInfo;
      })
    );

    res.json(requestsWithImages);
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.checkVehicleRestrictions = async (req, res) => {
  try {
    const { vehicleNumber } = req.params;

    if (!vehicleNumber) {
      return res.status(400).json({ error: "Vehicle number is required" });
    }

    // Check for pending requests
    const existingRequests = await Request.findAll({
      where: {
        vehicleNumber: vehicleNumber,
        status: {
          [require('sequelize').Op.notIn]: ['rejected', 'complete', 'order placed']
        }
      },
      order: [['submittedAt', 'DESC']]
    });

    if (existingRequests.length > 0) {
      return res.json({
        restricted: true,
        type: 'pending',
        message: `Vehicle ${vehicleNumber} already has a pending tire request. Please wait for the current request to be processed before submitting a new one.`,
        existingRequestId: existingRequests[0].id,
        existingRequestStatus: existingRequests[0].status
      });
    }

    // Check for recent completed requests (within 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCompletedRequests = await Request.findAll({
      where: {
        vehicleNumber: vehicleNumber,
        status: {
          [require('sequelize').Op.in]: ['complete', 'order placed']
        },
        submittedAt: {
          [require('sequelize').Op.gte]: thirtyDaysAgo
        }
      },
      order: [['submittedAt', 'DESC']]
    });

    if (recentCompletedRequests.length > 0) {
      const lastRequest = recentCompletedRequests[0];
      const daysSinceLastRequest = Math.ceil((new Date() - new Date(lastRequest.submittedAt)) / (1000 * 60 * 60 * 24));
      return res.json({
        restricted: true,
        type: 'recent',
        message: `Vehicle ${vehicleNumber} had a tire request completed ${daysSinceLastRequest} days ago. Please wait at least 30 days between tire requests for the same vehicle.`,
        lastRequestDate: lastRequest.submittedAt,
        daysRemaining: 30 - daysSinceLastRequest
      });
    }

    // No restrictions found
    res.json({
      restricted: false,
      message: "Vehicle is eligible for a new tire request"
    });

  } catch (error) {
    console.error("Error checking vehicle restrictions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierId, orderNotes, orderNumber, orderPlacedDate } = req.body;

    console.log(`Placing order for request ${id} with supplier ${supplierId} and order number ${orderNumber}`);

    // Validate order number
    if (!orderNumber || orderNumber.trim() === '') {
      return res.status(400).json({ error: "Order number is required" });
    }

    // Validate required fields
    if (!supplierId) {
      return res.status(400).json({ error: "Supplier ID is required" });
    }
    
    if (!orderNumber) {
      return res.status(400).json({ error: "Order number is required" });
    }

    if (!orderPlacedDate) {
      return res.status(400).json({ error: "Order placed date is required" });
    }

    // Validate order placed date format
    if (!isValidDate(orderPlacedDate)) {
      return res.status(400).json({ error: "Invalid order placed date format" });
    }

    // Get the request details
    const request = await Request.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Debug: Log request data to check if new fields are present
    console.log("Request data for email:", {
      id: request.id,
      vehicleNumber: request.vehicleNumber,
      deliveryOfficeName: request.deliveryOfficeName,
      deliveryStreetName: request.deliveryStreetName,
      deliveryTown: request.deliveryTown,
      totalPrice: request.totalPrice,
      warrantyDistance: request.warrantyDistance,
      tireWearIndicatorAppeared: request.tireWearIndicatorAppeared,
      orderNumber: orderNumber,
      orderNotes: orderNotes
    });

    // Check if request is complete (ready for order)
    if (request.status !== "complete") {
      return res.status(400).json({
        error: "Request must be complete before placing order",
        currentStatus: request.status,
      });
    }

    // Get supplier details
    const [suppliers] = await pool.query(
      "SELECT * FROM supplier WHERE id = ?",
      [supplierId]
    );
    if (suppliers.length === 0) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    const supplier = suppliers[0];

    // Store supplier details for later use in request update
    const supplierDetails = {
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone
    };

    // Validate supplier has FormsFree key
    if (!supplier.formsfree_key) {
      return res.status(400).json({
        error: "Supplier does not have a valid FormsFree key configured",
      });
    }

    // Send order email to supplier
    let emailResult;
    try {
      emailResult = await sendOrderEmail(supplier, request, orderNotes, orderNumber);
      console.log("Formspree email result:", emailResult);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      // Log full error object for debugging
      if (emailError.response) {
        console.error("Formspree response:", emailError.response.data);
      }
      return res.status(500).json({
        message: "Failed to send order email",
        error: emailError.message,
        details: emailError.response ? emailError.response.data : undefined,
      });
    }

    // Update request status to "order placed" and save order details
    try {
      // Update the request with order details and supplier information
      await pool.query(`
        UPDATE requests 
        SET 
          status = 'order placed',
          orderNumber = ?,
          orderNotes = ?,
          supplierName = ?,
          supplierEmail = ?,
          supplierPhone = ?,
          orderPlacedDate = ?
        WHERE id = ?
      `, [
        orderNumber,
        orderNotes,
        supplier.name,
        supplier.email,
        supplier.phone,
        orderPlacedDate,
        id
      ]);

      console.log("Successfully saved order details:", {
        orderNumber,
        orderNotes,
        supplierName: supplier.name,
        supplierEmail: supplier.email,
        supplierPhone: supplier.phone,
        id,
        status: "order placed"
      });
      // First try with all columns including order number and notes
      await pool.query(
        `UPDATE requests 
         SET status = ?,
             order_placed = true,
             order_timestamp = NOW(),
             order_number = ?,
             order_notes = ?,
             customer_officer_note = ?
         WHERE id = ?`,
        ["order placed", orderNumber, orderNotes, orderNotes, id]
      );
      console.log("Updated request with all columns including order details");
    } catch (error) {
      console.log("Full update failed, trying status only:", error.message);
      try {
        // If that fails, try just updating status
        await pool.query("UPDATE requests SET status = ? WHERE id = ?", [
          "order placed",
          id,
        ]);
        console.log("Updated request status only");
      } catch (statusError) {
        console.log(
          "Status update also failed, trying with enum check:",
          statusError.message
        );
        // If status update fails, it might be an enum issue, try with a valid enum value
        await pool.query(
          "UPDATE requests SET status = ? WHERE id = ?",
          ["complete", id] // Use 'complete' as fallback since 'order placed' might not be in enum
        );
        console.log("Updated request status to complete as fallback");
      }
    }

    console.log("Order placed successfully:", emailResult);
    // Try to generate a receipt record for this order
    try {
      const receiptController = require("./receiptController");
      // Call the generator with the request id as orderId (receiptController will look up request)
      const fakeReq = { params: { orderId: id } };
      // We create a small wrapper to capture the response instead of using res
      const fakeRes = {
        json: (body) => {
          console.log('Receipt generated:', body && body.receipt ? body.receipt.id : 'unknown');
        },
        status: (code) => ({ json: (body) => console.log('Receipt gen status', code, body) })
      };
      await receiptController.generateReceipt(fakeReq, fakeRes);
    } catch (rcErr) {
      console.error('Failed to generate receipt:', rcErr);
    }

    res.json({
      message: "Order placed successfully",
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
      },
      emailResult: emailResult,
      orderNotes: orderNotes,
    });
  } catch (err) {
    console.error("Error placing order:", err);

    // Check if this is just a database error but email was sent
    if (
      err.message &&
      err.message.includes("Data truncated") &&
      typeof emailResult !== "undefined"
    ) {
      // Email was sent successfully, return success despite database error
      console.log("Email sent successfully despite database error");
      res.json({
        message: "Order placed successfully (email sent)",
        supplier: {
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
        },
        emailResult: emailResult,
        orderNotes: orderNotes,
        warning:
          "Database update had issues but order email was sent successfully",
      });
    } else {
      res.status(500).json({
        message: "Error placing order",
        error: err.message,
      });
    }
  }
};

exports.deleteRequest = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await Request.destroy({ where: { id } });
    if (result === 0) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json({ message: "Request deleted successfully" });
  } catch (error) {
    console.error("Error deleting request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getRequestsByVehicleNumber = async (req, res) => {
  try {
    const { vehicleNumber } = req.params;
    
    if (!vehicleNumber || vehicleNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Vehicle number is required',
      });
    }

    console.log(`Fetching requests for vehicle: ${vehicleNumber}`);
    
    // First try exact match
    let requests = await Request.findAll({
      where: { vehicleNumber },
      order: [['submittedAt', 'DESC']],
      raw: true,
    });

    // If no exact matches, try case-insensitive search
    if (requests.length === 0) {
      console.log('No exact matches, trying case-insensitive search');
      requests = await Request.findAll({
        where: {
          vehicleNumber: {
            [Op.like]: `%${vehicleNumber}%`
          }
        },
        order: [['submittedAt', 'DESC']],
        raw: true,
      });
    }

    console.log(`Found ${requests.length} requests for vehicle: ${vehicleNumber}`);
    
    // Return empty array if no requests found
    if (!requests || requests.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No requests found for the specified vehicle number',
      });
    }

    res.status(200).json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error('Error in getRequestsByVehicleNumber:', {
      error: error.message,
      stack: error.stack,
      params: req.params,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      message: 'Error processing your request',
      error: error.message, // Always include the error message for debugging
    });
  }
};
