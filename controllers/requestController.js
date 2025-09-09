const RequestImage = require("../models/RequestImage");
const { Request, RequestBackup } = require("../models");
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
        error: `Vehicle ${requestData.vehicleNumber} already has a pending request. Please wait for the current request to be processed before submitting a new one.`,
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

        // Transform 'pending' status to 'User Requested Tire' for display
        const displayStatus = request.status === 'pending' ? 'User Requested tire' : request.status;

        // Only use actual department information, don't add defaults
        const departmentInfo = {
          ...request,
          status: displayStatus,
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

    // Transform 'pending' status to 'User Requested Tire' for display
    const displayStatus = request.status === 'pending' ? 'User Requested tire' : request.status;

    // Add images to the response
    res.json({ ...request.toJSON(), status: displayStatus, images: imageUrls });
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
      "Engineer Approved",
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
      status === "Engineer Approved" ||
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
        status === "Engineer Approved" ||
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
          [require('sequelize').Op.notIn]: ['rejected', 'complete', 'Engineer Approved', 'order placed']
        }
      },
      order: [['submittedAt', 'DESC']]
    });

    if (existingRequests.length > 0) {
      return res.json({
        restricted: true,
        type: 'pending',
        message: `Vehicle ${vehicleNumber} already has a pending request. Please wait for the current request to be processed before submitting a new one.`,
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
          [require('sequelize').Op.in]: ['complete', 'Engineer Approved', 'order placed']
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

    // Check if request is Engineer Approved (ready for order)
    if (request.status !== "Engineer Approved" && request.status !== "complete") {
      return res.status(400).json({
        error: "Request must be Engineer Approved before placing order",
        currentStatus: request.status,
      });
    }

    // Get supplier details using Sequelize model
    const Supplier = require('../models/Supplier');
    const supplier = await Supplier.findByPk(supplierId);
    
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    
    // Convert to plain object
    const supplierData = supplier.get({ plain: true });

    // Log supplier details for debugging
    console.log("Retrieved supplier details:", {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address
    });

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

        // Log successful order placement
        console.log("Processing order placement...");      console.log("Successfully saved order details:", {
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
  const connection = await pool.getConnection();
  
  try {
    const id = req.params.id;
    const { userId, userRole } = req.body; // Extract both userId and userRole
    
    console.log(`🗑️  DELETE REQUEST CALLED - ID: ${id}, UserID: ${userId}, UserRole: ${userRole}`);
    console.log('Request body:', req.body);
    console.log('Request params:', req.params);
    
    // Start transaction to ensure data integrity
    await connection.beginTransaction();
    console.log('✅ Transaction started');
    
    // First, check if the request exists
    const request = await Request.findByPk(id);
    if (!request) {
      console.log(`❌ Request ID ${id} not found`);
      await connection.rollback();
      return res.status(404).json({ message: "Request not found" });
    }
    
    console.log(`✅ Request found: ${request.id} - ${request.vehicleNumber}`);
    console.log(`🔄 Starting soft delete for request ID: ${id}`);
    
    // If userRole is not provided but userId is, try to fetch it from the database
    let finalUserRole = userRole;
    if (userId && !userRole) {
      try {
        const { User } = require('../models');
        const user = await User.findByPk(userId);
        if (user && user.role) {
          finalUserRole = user.role;
          console.log(`🔍 Retrieved user role from database: ${finalUserRole}`);
        }
      } catch (userFetchError) {
        console.warn('⚠️ Could not fetch user role from database:', userFetchError.message);
      }
    }
    
    // Build full backup payload from the request row
    const requestData = request.get ? request.get({ plain: true }) : request.toJSON();
    const { createdAt, updatedAt, ...cleanRequestData } = requestData;

    const backupData = {
      ...cleanRequestData,
      deletedAt: new Date(),
      deletedBy: userId || null,
    };
    
    // Only add deletedByRole if the column exists in the database
    try {
      // Check if the deletedByRole column exists
      const [columnCheck] = await connection.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requestbackup' AND COLUMN_NAME = 'deletedByRole'"
      );
      
      if (columnCheck.length > 0) {
        backupData.deletedByRole = finalUserRole || null;
        console.log('✅ deletedByRole column exists, adding role to backup data');
      } else {
        console.log('⚠️  deletedByRole column does not exist, skipping role in backup');
      }
    } catch (columnError) {
      console.warn('⚠️  Could not check for deletedByRole column:', columnError.message);
    }

    // Map differing column names between requests and requestbackup
    // Be robust: pull from either attribute names or raw DB column keys if present
    const deptFromAttr = Object.prototype.hasOwnProperty.call(backupData, 'userSection')
      ? backupData.userSection
      : undefined;
    const deptFromColumn = Object.prototype.hasOwnProperty.call(backupData, 'Department')
      ? backupData.Department
      : undefined;
    const costFromAttr = Object.prototype.hasOwnProperty.call(backupData, 'costCenter')
      ? backupData.costCenter
      : undefined;
    const costFromColumn = Object.prototype.hasOwnProperty.call(backupData, 'CostCenter')
      ? backupData.CostCenter
      : undefined;

    // Final values prefer attribute, then existing column key, else null
    const finalDepartment = (deptFromAttr ?? deptFromColumn ?? null);
    const finalCostCenter = (costFromAttr ?? costFromColumn ?? null);

    // Set normalized keys for insert and remove attribute keys to avoid duplicates
    backupData['Department'] = finalDepartment;
    backupData['CostCenter'] = finalCostCenter;
    if (Object.prototype.hasOwnProperty.call(backupData, 'userSection')) delete backupData.userSection;
    if (Object.prototype.hasOwnProperty.call(backupData, 'costCenter')) delete backupData.costCenter;

    console.log('🧭 Soft-delete mapping:', {
      original_userSection: deptFromAttr,
      original_Department: deptFromColumn,
      original_costCenter: costFromAttr,
      original_CostCenter: costFromColumn,
      mapped_Department: backupData['Department'],
      mapped_CostCenter: backupData['CostCenter']
    });

    // Ensure optional columns exist (keeps dynamic insert consistent)
    const optionalCols = [
      'deliveryOfficeName',
      'deliveryStreetName',
      'deliveryTown',
      'totalPrice',
      'warrantyDistance',
      'tireWearIndicatorAppeared',
      'supplierName',
      'supplierEmail',
      'supplierPhone',
      'orderNumber',
      'orderNotes',
      'orderPlacedDate',
      'supervisor_notes',
      'technical_manager_note',
      'engineer_note',
      'customer_officer_note',
      'technical_manager_id',
      'supervisor_decision_by',
      'engineer_decision_by',
      'customer_officer_decision_by',
      'Department',
      'CostCenter',
    ];
    
    // Only add deletedByRole to optional columns if it's already in backupData
    if (Object.prototype.hasOwnProperty.call(backupData, 'deletedByRole')) {
      optionalCols.push('deletedByRole');
    }
    for (const col of optionalCols) {
      if (!Object.prototype.hasOwnProperty.call(backupData, col)) {
        backupData[col] = null;
      }
    }

    // Insert into requestbackup
    const backupFields = Object.keys(backupData);
    const backupValues = Object.values(backupData);
    const placeholders = backupFields.map(() => '?').join(', ');
    const fieldNames = backupFields.join(', ');

    // Log the specific fields being inserted for Department/CostCenter
    console.log('🧾 Inserting into requestbackup with Department/CostCenter:', {
      Department: backupData['Department'],
      CostCenter: backupData['CostCenter'],
      deletedBy: backupData['deletedBy'],
      deletedByRole: backupData['deletedByRole']
    });

    await connection.query(
      `INSERT INTO requestbackup (${fieldNames}) VALUES (${placeholders})`,
      backupValues
    );
    console.log('✅ Request backed up to requestbackup table');

    // Get all request images before deletion
    const requestImages = await RequestImage.findAll({
      where: { requestId: id },
    });

    // Create request_images_backup table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS request_images_backup (
        id INT PRIMARY KEY,
        requestId INT NOT NULL,
        imagePath TEXT NOT NULL,
        imageIndex INT NOT NULL,
        deletedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_backup_request_id (requestId),
        INDEX idx_backup_deleted_at (deletedAt)
      )
    `);
    
    // Insert images into backup table
    for (const image of requestImages) {
      await connection.query(
        `INSERT INTO request_images_backup (id, requestId, imagePath, imageIndex, deletedAt) 
         VALUES (?, ?, ?, ?, ?)`,
        [image.id, image.requestId, image.imagePath, image.imageIndex, new Date()]
      );
    }
    
    console.log('✅ Request images backed up successfully');
    
    // Delete request images from original table
    if (requestImages.length > 0) {
      await connection.query('DELETE FROM request_images WHERE requestId = ?', [id]);
      console.log('🗑️  Original request images deleted');
    }
    
    // Delete the original request
    console.log(`🗑️  Deleting original request ${id} from requests table...`);
    const deleteResult = await connection.query('DELETE FROM requests WHERE id = ?', [id]);
    console.log('Delete result:', deleteResult[0]);
    console.log('✅ Original request deleted');
    
    // Commit the transaction
    await connection.commit();
    console.log('✅ Transaction committed');
    
    console.log(`🎉 Soft delete completed successfully for request ID: ${id}`);
    
    res.json({ 
      message: "Request deleted successfully and moved to backup",
      deletedRequestId: id,
      backupCreated: true,
      imagesBackedUp: requestImages.length,
      success: true
    });
    
  } catch (error) {
    // Rollback transaction on error
    await connection.rollback();
    console.error("❌ Error in soft delete process:", error);
    console.error("Error stack:", error.stack);
    
    res.status(500).json({ 
      error: "Failed to delete request", 
      details: error.message,
      requestId: req.params.id,
      success: false
    });
  } finally {
    // Always release the connection
    connection.release();
    console.log('🔚 Database connection released');
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
    
    // Transform 'pending' status to 'User Requested Tire' for display
    const requestsWithTransformedStatus = requests.map(request => ({
      ...request,
      status: request.status === 'pending' ? 'User Requested tire' : request.status
    }));
    
    // Return empty array if no requests found
    if (!requestsWithTransformedStatus || requestsWithTransformedStatus.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No requests found for the specified vehicle number',
      });
    }

    res.status(200).json({
      success: true,
      data: requestsWithTransformedStatus,
      count: requestsWithTransformedStatus.length,
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
      error: error.message,
    });
  }
};

// Get deleted requests from backup table with advanced filtering
exports.getDeletedRequests = async (req, res) => {
  try {
    console.log('🗃️ Fetching deleted requests from backup table with filters...');
    console.log('Query parameters:', req.query);
    
    // First, let's test if the table exists and has data
    const [tableTest] = await pool.query('SELECT COUNT(*) as count FROM requestbackup');
    console.log('📊 Total records in requestbackup table:', tableTest[0].count);
    
    // Extract query parameters for filtering
    const {
      page = 1,
      limit = 50,
      vehicleNumber,
      status,
      requesterName,
      startDate,
      endDate,
      deletedBy,
      deletedByRole,
      sortBy = 'deletedAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause for filtering
    let whereConditions = [];
    let queryParams = [];
    
    if (vehicleNumber) {
      whereConditions.push('rb.vehicleNumber LIKE ?');
      queryParams.push(`%${vehicleNumber}%`);
    }
    
    if (status) {
      whereConditions.push('rb.status = ?');
      queryParams.push(status);
    }
    
    if (requesterName) {
      whereConditions.push('rb.requesterName LIKE ?');
      queryParams.push(`%${requesterName}%`);
    }
    
    if (startDate) {
      whereConditions.push('DATE(rb.deletedAt) >= ?');
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('DATE(rb.deletedAt) <= ?');
      queryParams.push(endDate);
    }
    
    if (deletedBy) {
      whereConditions.push('rb.deletedBy = ?');
      queryParams.push(deletedBy);
    }
    
    // Only add deletedByRole filter if the column exists and filter is provided
    if (deletedByRole) {
      try {
        const [columnCheck] = await pool.query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requestbackup' AND COLUMN_NAME = 'deletedByRole'"
        );
        
        if (columnCheck.length > 0) {
          whereConditions.push('rb.deletedByRole = ?');
          queryParams.push(deletedByRole);
          console.log('✅ Using deletedByRole filter');
        } else {
          console.log('⚠️  deletedByRole column does not exist, skipping role filter');
        }
      } catch (columnError) {
        console.warn('⚠️  Could not check for deletedByRole column, skipping role filter:', columnError.message);
      }
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate sort parameters
    const validSortFields = ['deletedAt', 'submittedAt', 'vehicleNumber', 'status', 'requesterName'];
    const validSortOrders = ['ASC', 'DESC'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'deletedAt';
    const safeSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    // Build the main query - simplified for debugging
    const mainQuery = `
      SELECT rb.* 
      FROM requestbackup rb
      ${whereClause}
      ORDER BY rb.${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;
    
    // Build the count query
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM requestbackup rb
      ${whereClause}
    `;
    
    console.log('🔍 Executing queries with filters:', {
      vehicleNumber,
      status,
      requesterName,
      dateRange: { startDate, endDate },
      pagination: { page, limit, offset },
      sorting: { sortBy: safeSortBy, sortOrder: safeSortOrder }
    });
    
    console.log('📋 Main query:', mainQuery);
    console.log('📋 Query params:', [...queryParams, parseInt(limit), offset]);
    
    // Execute queries
    const [deletedRequests, [{ total }]] = await Promise.all([
      pool.query(mainQuery, [...queryParams, parseInt(limit), offset]),
      pool.query(countQuery, queryParams)
    ]);
    
    console.log(`📊 Raw query results:`, deletedRequests[0]);
    console.log(`📊 Found ${deletedRequests[0].length} deleted requests (page ${page} of ${Math.ceil(total / limit)})`);
    console.log(`📊 Total count from database:`, total);
    
    // Add images to requests - simplified
    const requestsWithImages = deletedRequests[0].map((request) => {
      // Transform 'pending' status to 'User Requested Tire' for display
      const displayStatus = request.status === 'pending' ? 'User Requested tire' : request.status;
      
      return {
        ...request,
        status: displayStatus,
        images: [],
        isDeleted: true,
        canRestore: true,
        daysSinceDeleted: request.deletedAt ? Math.floor((new Date() - new Date(request.deletedAt)) / (1000 * 60 * 60 * 24)) : 0
      };
    });
    
    res.json({
      success: true,
      data: requestsWithImages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit),
        hasNext: (parseInt(page) * parseInt(limit)) < total,
        hasPrev: parseInt(page) > 1
      },
      filters: {
        vehicleNumber: vehicleNumber || null,
        status: status || null,
        requesterName: requesterName || null,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        deletedBy: deletedBy || null,
        deletedByRole: deletedByRole || null
      },
      sorting: {
        sortBy: safeSortBy,
        sortOrder: safeSortOrder
      },
      message: `Found ${requestsWithImages.length} deleted requests`
    });
    
  } catch (error) {
    console.error('❌ Error fetching deleted requests:', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Error fetching deleted requests',
      error: error.message,
    });
  }
};

// Restore a deleted request from backup
exports.restoreDeletedRequest = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { userId, userRole } = req.body; // User performing the restoration
    
    console.log(`🔄 Starting restoration of deleted request ID: ${id}`);
    console.log(`👤 Restoration requested by user ID: ${userId}, role: ${userRole}`);
    
    // Start transaction
    await connection.beginTransaction();
    
    // Check if request exists in backup
    const [backupRequests] = await connection.query(
      'SELECT * FROM requestbackup WHERE id = ?',
      [id]
    );
    
    if (backupRequests.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false,
        message: "Deleted request not found in backup" 
      });
    }
    
    const backupRequest = backupRequests[0];
    
    // Role-based authorization check: Only allow restore if user's role matches the deletedByRole
    if (backupRequest.deletedByRole && userRole) {
      if (backupRequest.deletedByRole !== userRole) {
        await connection.rollback();
        console.log(`🚫 Access denied: User role '${userRole}' cannot restore request deleted by role '${backupRequest.deletedByRole}'`);
        return res.status(403).json({ 
          success: false,
          message: `Access denied: Only users with '${backupRequest.deletedByRole}' role can restore this request`,
          deletedByRole: backupRequest.deletedByRole,
          userRole: userRole
        });
      }
    } else if (backupRequest.deletedByRole && !userRole) {
      // If deletedByRole exists but userRole is not provided
      await connection.rollback();
      return res.status(400).json({ 
        success: false,
        message: "User role is required for authorization" 
      });
    }
    
    console.log(`✅ Authorization passed: User role '${userRole}' matches deletion role '${backupRequest.deletedByRole}'`);
    
    // Check if a request with this ID already exists in the main table
    const [existingRequests] = await connection.query(
      'SELECT id FROM requests WHERE id = ?',
      [id]
    );
    
    if (existingRequests.length > 0) {
      await connection.rollback();
      return res.status(409).json({ 
        success: false,
        message: "A request with this ID already exists in the main table" 
      });
    }
    
    // Prepare data for restoration (remove backup-specific fields)
    const { deletedAt, deletedBy, deletedByRole, ...requestData } = backupRequest;
    
    // Get the main table structure to ensure compatibility
    const [mainTableColumns] = await connection.query('DESCRIBE requests');
    const validColumns = mainTableColumns.map(col => col.Field);
    
    // Filter out any fields that don't exist in the main table
    const compatibleData = {};
    Object.keys(requestData).forEach(key => {
      if (validColumns.includes(key)) {
        compatibleData[key] = requestData[key];
      } else {
        console.log(`⚠️  Skipping field '${key}' - not found in main table`);
      }
    });
    
    console.log(`🔄 Restoring ${Object.keys(compatibleData).length} compatible fields`);
    
    // Restore to main requests table
    const fields = Object.keys(compatibleData);
    const values = Object.values(compatibleData);
    const placeholders = fields.map(() => '?').join(', ');
    const fieldNames = fields.join(', ');
    
    await connection.query(
      `INSERT INTO requests (${fieldNames}) VALUES (${placeholders})`,
      values
    );
    
    console.log('✅ Request restored to main table');
    
    // Restore images if they exist in backup
    const [backupImages] = await connection.query(
      'SELECT * FROM request_images_backup WHERE requestId = ?',
      [id]
    );
    
    if (backupImages.length > 0) {
      console.log(`📸 Restoring ${backupImages.length} images...`);
      
      for (const image of backupImages) {
        const { deletedAt, ...imageData } = image;
        await connection.query(
          'INSERT INTO request_images (id, requestId, imagePath, imageIndex) VALUES (?, ?, ?, ?)',
          [imageData.id, imageData.requestId, imageData.imagePath, imageData.imageIndex]
        );
      }
      
      // Remove from backup images table
      await connection.query(
        'DELETE FROM request_images_backup WHERE requestId = ?',
        [id]
      );
      
      console.log('✅ Images restored successfully');
    }
    
    // Remove from backup table
    await connection.query('DELETE FROM requestbackup WHERE id = ?', [id]);
    
    console.log('✅ Request removed from backup table');
    
    // Commit transaction
    await connection.commit();
    
    console.log(`🎉 Request restoration completed successfully for ID: ${id}`);
    
    res.json({
      success: true,
      message: "Request restored successfully",
      restoredRequestId: id,
      imagesRestored: backupImages.length
    });
    
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error restoring deleted request:", error);
    
    res.status(500).json({
      success: false,
      message: "Failed to restore request",
      error: error.message,
      requestId: req.params.id
    });
  } finally {
    connection.release();
  }
};

// Get deleted requests for a specific user
exports.getDeletedRequestsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 20,
      status,
      vehicleNumber,
      startDate,
      endDate,
      requesterName,
      sortBy = 'deletedAt',
      sortOrder = 'DESC'
    } = req.query;
    
    console.log(` Fetching deleted requests for user ID: ${userId}`);
    console.log('Query parameters:', req.query);
    
    // Test if table has data for this user
    const [userTest] = await pool.query('SELECT COUNT(*) as count FROM requestbackup WHERE userId = ?', [userId]);
    console.log(` Total records for user ${userId} in requestbackup:`, userTest[0].count);
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause for user-specific filtering
    let whereConditions = ['rb.userId = ?'];
    let queryParams = [userId];
    
    if (status) {
      whereConditions.push('rb.status = ?');
      queryParams.push(status);
    }
    
    if (vehicleNumber) {
      whereConditions.push('rb.vehicleNumber LIKE ?');
      queryParams.push(`%${vehicleNumber}%`);
    }
    
    if (requesterName) {
      whereConditions.push('rb.requesterName LIKE ?');
      queryParams.push(`%${requesterName}%`);
    }
    
    if (startDate) {
      whereConditions.push('DATE(rb.deletedAt) >= ?');
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('DATE(rb.deletedAt) <= ?');
      queryParams.push(endDate);
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Validate sort parameters
    const validSortFields = ['deletedAt', 'submittedAt', 'vehicleNumber', 'status', 'requesterName'];
    const validSortOrders = ['ASC', 'DESC'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'deletedAt';
    const safeSortOrder = validSortOrders.includes(String(sortOrder).toUpperCase()) ? String(sortOrder).toUpperCase() : 'DESC';
    
    const [deletedRequests, [{ total }]] = await Promise.all([
      pool.query(`
        SELECT rb.*
        FROM requestbackup rb
        ${whereClause}
        ORDER BY rb.${safeSortBy} ${safeSortOrder}
        LIMIT ? OFFSET ?
      `, [...queryParams, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) as total FROM requestbackup rb ${whereClause}`, queryParams)
    ]);
    
    console.log(` Raw results for user ${userId}:`, deletedRequests[0]);
    console.log(` Total count for user ${userId}:`, total);
    
    // Add images to requests - simplified
    const requestsWithImages = deletedRequests[0].map((request) => {
      return {
        ...request,
        images: [],
        isDeleted: true,
        canRestore: true,
        daysSinceDeleted: request.deletedAt ? Math.floor((new Date() - new Date(request.deletedAt)) / (1000 * 60 * 60 * 24)) : 0
      };
    });
    
    res.json({
      success: true,
      data: requestsWithImages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit),
        hasNext: (parseInt(page) * parseInt(limit)) < total,
        hasPrev: parseInt(page) > 1
      },
      sorting: {
        sortBy: safeSortBy,
        sortOrder: safeSortOrder
      },
      message: `Found ${requestsWithImages.length} deleted requests for user ${userId}`
    });
    
  } catch (error) {
    console.error(' Error fetching user deleted requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deleted requests',
      error: error.message
    });
  }
};

// Get one deleted request (from backup) with images
exports.getDeletedRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    // Fetch the deleted request row from requestbackup
    const [rows] = await pool.query(
      `SELECT rb.* FROM requestbackup rb WHERE rb.id = ? LIMIT 1`,
      [id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Deleted request not found' });
    }

    const deletedRequest = rows[0];

    // Fetch backup images for this request
    const [images] = await pool.query(
      `SELECT imagePath, imageIndex FROM request_images_backup WHERE requestId = ? ORDER BY imageIndex ASC`,
      [id]
    );

    // Normalize field names for frontend convenience
    // Transform 'pending' status to 'User Requested Tire' for display
    const displayStatus = deletedRequest.status === 'pending' ? 'User Requested tire' : deletedRequest.status;
    
    const response = {
      ...deletedRequest,
      status: displayStatus,
      images: images.map(i => i.imagePath),
      Department: deletedRequest.Department ?? null,
      CostCenter: deletedRequest.CostCenter ?? null,
      isDeleted: true,
    };

    return res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching deleted request by id:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Test endpoint for debugging soft delete
exports.testBackupCount = async (req, res) => {
  try {
    const { pool } = require('../config/db');
    
    // Check if requestbackup table exists
    const [tableExists] = await pool.query(`
      SELECT COUNT(*) as tableExists 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'requestbackup'
    `);
    
    if (tableExists[0].tableExists === 0) {
      return res.json({
        error: 'requestbackup table does not exist',
        backupCount: 0,
        originalCount: 0,
        tableExists: false
      });
    }
    
    // Get counts from both tables
    const [backupRows] = await pool.query('SELECT COUNT(*) as count FROM requestbackup');
    const [originalRows] = await pool.query('SELECT COUNT(*) as count FROM requests');
    
    // Get sample data from backup table
    const [sampleData] = await pool.query('SELECT * FROM requestbackup LIMIT 5');
    
    res.json({
      success: true,
      backupCount: backupRows[0].count,
      originalCount: originalRows[0].count,
      tableExists: true,
      sampleData: sampleData,
      message: 'Backup table status'
    });
  } catch (error) {
    console.error('Error checking backup table:', error);
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
};














