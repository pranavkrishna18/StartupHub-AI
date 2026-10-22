const Fundraising = require('../models/Fundraising');
const TermSheet = require('../models/TermSheet');
const Startup = require('../models/Startup');
const Profile = require('../models/Profile');
const aiService = require('../services/aiService');
const AppError = require('../utils/appError');
const notificationService = require('../services/notificationService');

// GET OR INITIALIZE FUNDRAISING PROFILE
exports.getFundraisingProfile = async (req, res, next) => {
  try {
    const { startupId } = req.params;

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    let profile = await Fundraising.findOne({ startup: startupId });
    
    // Auto-initialize default fundraising profile if requested by founder and doesn't exist
    if (!profile && startup.founder.toString() === req.user.id) {
      profile = await Fundraising.create({
        startup: startupId,
        targetRaise: 500000,
        equityOffered: 10,
        capTable: [
          {
            holderName: 'Founder Owner',
            shares: 9000000,
            ownership: 90,
            role: 'Founder'
          }
        ],
        vdrFiles: [],
        ndas: [],
        accessGrants: [req.user.id]
      });
    }

    if (!profile) {
      return next(new AppError('Fundraising profile not initialized for this startup yet.', 404));
    }

    // Fetch term sheets associated with this startup
    const termSheets = await TermSheet.find({ startup: startupId }).populate('investor', 'email');

    res.status(200).json({
      status: 'success',
      data: {
        profile,
        termSheets
      }
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE FUNDRAISING CONFIG (FOUNDER ONLY)
exports.updateFundraisingConfig = async (req, res, next) => {
  try {
    const { startupId } = req.params;
    const { targetRaise, equityOffered, pitchDeckUrl, capTable, vdrFiles } = req.body;

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    if (startup.founder.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Only the startup owner can edit fundraising profiles', 403));
    }

    const profile = await Fundraising.findOneAndUpdate(
      { startup: startupId },
      { targetRaise, equityOffered, pitchDeckUrl, capTable, vdrFiles },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { profile }
    });
  } catch (err) {
    next(err);
  }
};

// SIGN NDA (INVESTORS)
exports.signNDA = async (req, res, next) => {
  try {
    const { startupId } = req.params;
    const { signatureText, investorName } = req.body;

    if (!signatureText || !investorName) {
      return next(new AppError('Please provide legal signature text and investor name', 400));
    }

    const profile = await Fundraising.findOne({ startup: startupId });
    if (!profile) {
      return next(new AppError('Fundraising profile not found', 404));
    }

    // Check if already signed
    const hasSigned = profile.ndas.some(n => n.investor?.toString() === req.user.id);
    if (hasSigned) {
      return res.status(200).json({
        status: 'success',
        message: 'NDA already signed',
        data: { profile }
      });
    }

    profile.ndas.push({
      investor: req.user.id,
      investorName,
      signatureText,
      signedAt: new Date()
    });

    if (!profile.accessGrants.includes(req.user.id)) {
      profile.accessGrants.push(req.user.id);
    }

    await profile.save();

    // Notify Founder
    const startup = await Startup.findById(startupId);
    try {
      await notificationService.sendNotification({
        senderId: req.user.id,
        receiverId: startup.founder,
        type: 'announcement',
        title: 'NDA Signed! ✍️',
        message: `Investor ${investorName} has signed your Digital NDA. They now have Virtual Data Room (VDR) access.`,
        resourceType: 'Startup',
        resourceId: startupId,
        triggerEmail: true
      });
    } catch (notiErr) {
      console.error('[NDA SIGN NOTIFICATION ERROR]', notiErr.message);
    }

    res.status(200).json({
      status: 'success',
      message: 'NDA signed successfully',
      data: { profile }
    });
  } catch (err) {
    next(err);
  }
};

// GET VDR DOCUMENTS (COMPLIANCE ENFORCED)
exports.getVdrDocuments = async (req, res, next) => {
  try {
    const { startupId } = req.params;

    const profile = await Fundraising.findOne({ startup: startupId });
    if (!profile) {
      return next(new AppError('Fundraising profile not found', 404));
    }

    const startup = await Startup.findById(startupId);
    const isFounder = startup.founder.toString() === req.user.id;
    const isGranted = profile.accessGrants.includes(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isFounder && !isGranted && !isAdmin) {
      return next(new AppError('Compliance access denied: You must sign the digital NDA to view the Virtual Data Room.', 403));
    }

    res.status(200).json({
      status: 'success',
      data: {
        vdrFiles: profile.vdrFiles
      }
    });
  } catch (err) {
    next(err);
  }
};

// GENERATE AI TERM SHEET (INVESTORS)
exports.generateTermSheet = async (req, res, next) => {
  try {
    const { startupId } = req.params;
    const { investmentAmount, equityOffered, valuation } = req.body;

    if (!investmentAmount || !equityOffered || !valuation) {
      return next(new AppError('Please provide investment amount, equity percentage, and pre-money valuation coordinates', 400));
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    const profile = await Fundraising.findOne({ startup: startupId });
    if (!profile) {
      return next(new AppError('Fundraising profile not found', 404));
    }

    console.log(`[TERM SHEET] Compiling AI Legal contract proposal for ${startup.name}...`);

    // Call LLM
    const termsText = await aiService.generateTermSheetDraft(
      startup.name,
      profile.targetRaise,
      investmentAmount,
      equityOffered,
      valuation
    );

    // Save term sheet
    const sheet = await TermSheet.create({
      startup: startupId,
      investor: req.user.id,
      targetRaise: profile.targetRaise,
      investmentAmount,
      equityOffered,
      valuation,
      termsText,
      status: 'submitted'
    });

    // Notify Founder
    try {
      await notificationService.sendNotification({
        senderId: req.user.id,
        receiverId: startup.founder,
        type: 'announcement',
        title: 'New Term Sheet Offer! 📈',
        message: `An investor has submitted a Term Sheet proposal: $${investmentAmount.toLocaleString()} for ${equityOffered}% equity.`,
        resourceType: 'Startup',
        resourceId: startupId,
        triggerEmail: true
      });
    } catch (notiErr) {
      console.error('[TERM SHEET NOTIFICATION ERROR]', notiErr.message);
    }

    res.status(201).json({
      status: 'success',
      data: { termSheet: sheet }
    });
  } catch (err) {
    next(err);
  }
};

// RESPOND TO TERM SHEET (FOUNDER ONLY)
exports.respondToTermSheet = async (req, res, next) => {
  try {
    const { sheetId } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'

    if (!['accepted', 'rejected'].includes(status)) {
      return next(new AppError('Please specify response status: accepted or rejected', 400));
    }

    const sheet = await TermSheet.findById(sheetId).populate('startup');
    if (!sheet) {
      return next(new AppError('Term sheet not found', 404));
    }

    if (sheet.startup.founder.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Only the startup owner can respond to term sheets', 403));
    }

    sheet.status = status;
    if (status === 'accepted') {
      sheet.signedAt = new Date();

      // If accepted, add the investor to the cap table!
      const profile = await Fundraising.findOne({ startup: sheet.startup._id });
      if (profile) {
        profile.capTable.push({
          holderName: `Investor (${req.user.email})`,
          shares: Math.round(sheet.investmentAmount / 10), // Mock share calculation
          ownership: sheet.equityOffered,
          role: 'Investor'
        });

        // Re-scale founder ownership accordingly
        if (profile.capTable.length > 0 && profile.capTable[0].holderName === 'Founder Owner') {
          profile.capTable[0].ownership = Math.max(0, profile.capTable[0].ownership - sheet.equityOffered);
        }
        await profile.save();
      }
    }

    await sheet.save();

    // Notify Investor
    try {
      await notificationService.sendNotification({
        senderId: req.user.id,
        receiverId: sheet.investor,
        type: 'announcement',
        title: `Term Sheet ${status.toUpperCase()}! ✍️`,
        message: `The founder of ${sheet.startup.name} has ${status} your Term Sheet proposal.`,
        resourceType: 'Startup',
        resourceId: sheet.startup._id,
        triggerEmail: true
      });
    } catch (notiErr) {
      console.error('[TERM SHEET RESPOND NOTIFICATION ERROR]', notiErr.message);
    }

    res.status(200).json({
      status: 'success',
      data: { termSheet: sheet }
    });
  } catch (err) {
    next(err);
  }
};

// GET INVESTOR DASHBOARD ACTIONS
exports.getInvestorDashboard = async (req, res, next) => {
  try {
    const termSheets = await TermSheet.find({ investor: req.user.id }).populate('startup', 'name');
    const ndaProfiles = await Fundraising.find({ 'ndas.investor': req.user.id }).populate('startup', 'name tagline');

    res.status(200).json({
      status: 'success',
      data: {
        termSheets,
        ndaProfiles: ndaProfiles.map(p => ({
          startupId: p.startup?._id,
          name: p.startup?.name,
          tagline: p.startup?.tagline,
          targetRaise: p.targetRaise,
          equityOffered: p.equityOffered
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};
