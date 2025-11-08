// app/lib/models/invoice.ts
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// Invoice Type Definition
export interface IInvoice extends Document {
  // Core Invoice Information
  invoice_number: string;
  user_id: Types.ObjectId;
  type: 'initial' | 'confirmation';
  amount_cents: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'failed';
  sent_at?: Date;
  paid_at?: Date;
  
  // Payment Information
  payment_method?: 'mpesa' | 'admin' | 'manual' | 'bank_transfer' | 'card';
  payment_reference?: string; // M-Pesa receipt, transaction ID, etc.
  payment_transaction_id?: Types.ObjectId; // Reference to Transaction document
  
  // Invoice Details
  currency: string;
  due_date?: Date;
  issue_date: Date;
  
  // User and Business Information
  user_details: {
    name: string;
    email: string;
    phone?: string;
  };
  
  business_details: {
    name: string;
    address: string;
    phone: string;
    email: string;
    tax_id?: string;
  };
  
  // Invoice Items
  items: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    tax_rate?: number; // Percentage (e.g., 16 for 16%)
  }>;
  
  // Financial Summary
  subtotal_cents: number;
  tax_amount_cents?: number;
  total_cents: number;
  
  // Metadata
  metadata?: {
    original_invoice_number?: string; // For confirmation invoices
    activation_payment_id?: Types.ObjectId;
    mpesa_transaction_id?: Types.ObjectId;
    admin_notes?: string;
    email_message_id?: string; // Email service message ID
    retry_count?: number;
    last_retry_at?: Date;
    pdf_url?: string; // URL to generated PDF
    template_used?: string;
    custom_notes?: string;
  };
  
  // System Fields
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Mongoose Schema
const InvoiceSchema: Schema<IInvoice> = new Schema(
  {
    // Core Invoice Information
    invoice_number: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true
    },
    
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true
    },
    
    type: {
      type: String,
      required: true,
      enum: ['initial', 'confirmation'],
      index: true
    },
    
    amount_cents: {
      type: Number,
      required: true,
      min: 0,
      comment: 'Amount in cents (KES * 100)'
    },
    
    status: {
      type: String,
      required: true,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'failed'],
      default: 'draft',
      index: true
    },
    
    sent_at: {
      type: Date,
      index: true
    },
    
    paid_at: {
      type: Date,
      index: true
    },
    
    // Payment Information
    payment_method: {
      type: String,
      enum: ['mpesa', 'admin', 'manual', 'bank_transfer', 'card'],
      index: true
    },
    
    payment_reference: {
      type: String,
      trim: true,
      index: true
    },
    
    payment_transaction_id: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true
    },
    
    // Invoice Details
    currency: {
      type: String,
      required: true,
      default: 'KES',
      uppercase: true,
      trim: true
    },
    
    due_date: {
      type: Date,
      index: true // This is the primary index definition for due_date
    },
    
    issue_date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    
    // User and Business Information
    user_details: {
      name: {
        type: String,
        required: true,
        trim: true
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
      },
      phone: {
        type: String,
        trim: true
      }
    },
    
    business_details: {
      name: {
        type: String,
        required: true,
        trim: true
      },
      address: {
        type: String,
        required: true,
        trim: true
      },
      phone: {
        type: String,
        required: true,
        trim: true
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
      },
      tax_id: {
        type: String,
        trim: true
      }
    },
    
    // Invoice Items
    items: [{
      description: {
        type: String,
        required: true,
        trim: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
      },
      unit_price_cents: {
        type: Number,
        required: true,
        min: 0
      },
      total_cents: {
        type: Number,
        required: true,
        min: 0
      },
      tax_rate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    }],
    
    // Financial Summary
    subtotal_cents: {
      type: Number,
      required: true,
      min: 0
    },
    
    tax_amount_cents: {
      type: Number,
      min: 0,
      default: 0
    },
    
    total_cents: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Metadata
    metadata: {
      original_invoice_number: {
        type: String,
        trim: true,
        uppercase: true
      },
      activation_payment_id: {
        type: Schema.Types.ObjectId,
        ref: 'ActivationPayment'
      },
      mpesa_transaction_id: {
        type: Schema.Types.ObjectId,
        ref: 'MpesaTransaction'
      },
      admin_notes: {
        type: String,
        trim: true
      },
      email_message_id: {
        type: String,
        trim: true
      },
      retry_count: {
        type: Number,
        default: 0,
        min: 0
      },
      last_retry_at: Date,
      pdf_url: {
        type: String,
        trim: true
      },
      template_used: {
        type: String,
        trim: true
      },
      custom_notes: {
        type: String,
        trim: true
      }
    },
    
    // System Fields
    deleted_at: {
      type: Date,
      index: true
    }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Virtual for formatted amount
InvoiceSchema.virtual('amount_kes').get(function() {
  return this.amount_cents / 100;
});

InvoiceSchema.virtual('subtotal_kes').get(function() {
  return this.subtotal_cents / 100;
});

InvoiceSchema.virtual('tax_amount_kes').get(function() {
  return this.tax_amount_cents / 100;
});

InvoiceSchema.virtual('total_kes').get(function() {
  return this.total_cents / 100;
});

// Indexes for better query performance
InvoiceSchema.index({ invoice_number: 1, type: 1 });
InvoiceSchema.index({ user_id: 1, type: 1 });
InvoiceSchema.index({ user_id: 1, status: 1 });
InvoiceSchema.index({ type: 1, status: 1 });
InvoiceSchema.index({ created_at: -1 });
// REMOVED: InvoiceSchema.index({ due_date: 1 }); // Removed to fix the duplicate index warning
InvoiceSchema.index({ 'user_details.email': 1 });

// Pre-save middleware to calculate totals
InvoiceSchema.pre('save', function(next) {
  // Calculate item totals if items are modified
  if (this.isModified('items') && this.items.length > 0) {
    this.items.forEach(item => {
      item.total_cents = item.quantity * item.unit_price_cents;
    });
    
    // Calculate subtotal (sum of all items)
    this.subtotal_cents = this.items.reduce((sum, item) => sum + item.total_cents, 0);
    
    // Calculate tax amount
    this.tax_amount_cents = this.items.reduce((sum, item) => {
      const itemTax = item.tax_rate ? (item.total_cents * item.tax_rate) / 100 : 0;
      return sum + Math.round(itemTax);
    }, 0);
    
    // Calculate total
    this.total_cents = this.subtotal_cents + this.tax_amount_cents;
  }
  
  // Set amount_cents to match total_cents if not explicitly set
  if (!this.amount_cents || this.isModified('total_cents')) {
    this.amount_cents = this.total_cents;
  }
  
  next();
});

// Static Methods
InvoiceSchema.statics = {
  /**
   * Find invoices by user ID with pagination
   */
  async findByUserId(userId: string | Types.ObjectId, options: { 
    page?: number; 
    limit?: number; 
    type?: string;
    status?: string;
  } = {}) {
    const { page = 1, limit = 10, type, status } = options;
    const skip = (page - 1) * limit;
    
    const query: any = { 
      user_id: new Types.ObjectId(userId.toString()),
      deleted_at: { $exists: false }
    };
    
    if (type) query.type = type;
    if (status) query.status = status;
    
    const [invoices, total] = await Promise.all([
      this.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.countDocuments(query)
    ]);
    
    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },
  
  /**
   * Find invoice by invoice number
   */
  async findByInvoiceNumber(invoiceNumber: string) {
    return this.findOne({ 
      invoice_number: invoiceNumber.toUpperCase(),
      deleted_at: { $exists: false }
    });
  },
  
  /**
   * Get invoice statistics for a user
   */
  async getUserInvoiceStats(userId: string | Types.ObjectId) {
    const stats = await this.aggregate([
      {
        $match: {
          user_id: new Types.ObjectId(userId.toString()),
          deleted_at: { $exists: false }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_amount: { $sum: '$amount_cents' }
        }
      }
    ]);
    
    const totalStats = await this.aggregate([
      {
        $match: {
          user_id: new Types.ObjectId(userId.toString()),
          deleted_at: { $exists: false }
        }
      },
      {
        $group: {
          _id: null,
          total_invoices: { $sum: 1 },
          total_amount: { $sum: '$amount_cents' },
          paid_amount: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'paid'] }, '$amount_cents', 0] 
            } 
          }
        }
      }
    ]);
    
    return {
      by_status: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          total_amount: stat.total_amount / 100
        };
        return acc;
      }, {}),
      totals: totalStats[0] ? {
        total_invoices: totalStats[0].total_invoices,
        total_amount: totalStats[0].total_amount / 100,
        paid_amount: totalStats[0].paid_amount / 100
      } : {
        total_invoices: 0,
        total_amount: 0,
        paid_amount: 0
      }
    };
  }
};

// Instance Methods
InvoiceSchema.methods = {
  /**
   * Mark invoice as sent
   */
  async markAsSent(emailMessageId?: string) {
    this.status = 'sent';
    this.sent_at = new Date();
    
    if (emailMessageId) {
      this.metadata = {
        ...this.metadata,
        email_message_id: emailMessageId
      };
    }
    
    return this.save();
  },
  
  /**
   * Mark invoice as paid
   */
  async markAsPaid(paymentMethod: string, paymentReference: string, transactionId?: Types.ObjectId) {
    this.status = 'paid';
    this.paid_at = new Date();
    this.payment_method = paymentMethod as any;
    this.payment_reference = paymentReference;
    
    if (transactionId) {
      this.payment_transaction_id = transactionId;
    }
    
    return this.save();
  },
  
  /**
   * Check if invoice is overdue
   */
  isOverdue() {
    if (!this.due_date || this.status !== 'sent') {
      return false;
    }
    
    return new Date() > this.due_date;
  },
  
  /**
   * Get invoice as PDF data (placeholder for PDF generation)
   */
  async generatePDF() {
    // This would integrate with a PDF generation service
    // For now, return a placeholder
    return {
      pdf_url: `/api/invoices/${this._id}/pdf`,
      generated_at: new Date()
    };
  }
};

// Export the Model
export const Invoice: Model<IInvoice> = mongoose.models.Invoice || 
  mongoose.model<IInvoice>('Invoice', InvoiceSchema);

// Type Definitions for API responses
export interface InvoiceCreateData {
  invoice_number: string;
  user_id: string;
  type: 'initial' | 'confirmation';
  amount_cents: number;
  user_details: {
    name: string;
    email: string;
    phone?: string;
  };
  business_details: {
    name: string;
    address: string;
    phone: string;
    email: string;
    tax_id?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
    tax_rate?: number;
  }>;
  due_date?: Date;
  payment_method?: string;
  metadata?: {
    original_invoice_number?: string;
    activation_payment_id?: string;
    mpesa_transaction_id?: string;
    admin_notes?: string;
  };
}

export interface InvoiceUpdateData {
  status?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_transaction_id?: string;
  metadata?: any;
}

// Utility Functions
export const InvoiceUtils = {
  /**
   * Generate a unique invoice number
   */
  generateInvoiceNumber(type: 'initial' | 'confirmation'): string {
    const prefix = type === 'initial' ? 'INV' : 'CONF';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  },
  
  /**
   * Validate invoice data before creation
   */
  validateInvoiceData(data: Partial<InvoiceCreateData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.invoice_number) {
      errors.push('Invoice number is required');
    }
    
    if (!data.user_id) {
      errors.push('User ID is required');
    }
    
    if (!data.type) {
      errors.push('Invoice type is required');
    }
    
    if (!data.amount_cents || data.amount_cents <= 0) {
      errors.push('Valid amount is required');
    }
    
    if (!data.user_details?.name || !data.user_details?.email) {
      errors.push('User details (name and email) are required');
    }
    
    if (!data.business_details?.name || !data.business_details?.address || 
        !data.business_details?.phone || !data.business_details?.email) {
      errors.push('Complete business details are required');
    }
    
    if (!data.items || data.items.length === 0) {
      errors.push('At least one invoice item is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

export default Invoice;
