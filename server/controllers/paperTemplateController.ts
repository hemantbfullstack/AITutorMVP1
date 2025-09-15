import PaperTemplate from '../models/PaperTemplate.js';

// Create new paper template
const createPaperTemplate = async (req: any, res: any) => {
  try {
    const { name, metaJson } = req.body;

    const template = new PaperTemplate({
      name,
      metaJson
    });

    await template.save();

    res.status(201).json({
      message: 'Paper template created successfully',
      template
    });
  } catch (error) {
    console.error('Create paper template error:', error);
    res.status(500).json({ error: 'Failed to create paper template' });
  }
};

// Get all paper templates
const getPaperTemplates = async (req: any, res: any) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const templates = await PaperTemplate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await PaperTemplate.countDocuments(query);

    res.json({
      templates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get paper templates error:', error);
    res.status(500).json({ error: 'Failed to get paper templates' });
  }
};

// Get paper template by ID
const getPaperTemplate = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const template = await PaperTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ error: 'Paper template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Get paper template error:', error);
    res.status(500).json({ error: 'Failed to get paper template' });
  }
};

// Update paper template
const updatePaperTemplate = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, metaJson } = req.body;

    const template = await PaperTemplate.findByIdAndUpdate(
      id,
      { name, metaJson },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ error: 'Paper template not found' });
    }

    res.json({
      message: 'Paper template updated successfully',
      template
    });
  } catch (error) {
    console.error('Update paper template error:', error);
    res.status(500).json({ error: 'Failed to update paper template' });
  }
};

// Delete paper template
const deletePaperTemplate = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const template = await PaperTemplate.findByIdAndDelete(id);
    if (!template) {
      return res.status(404).json({ error: 'Paper template not found' });
    }

    res.json({ message: 'Paper template deleted successfully' });
  } catch (error) {
    console.error('Delete paper template error:', error);
    res.status(500).json({ error: 'Failed to delete paper template' });
  }
};

// Get paper template statistics
const getPaperTemplateStats = async (req: any, res: any) => {
  try {
    const totalTemplates = await PaperTemplate.countDocuments();

    const recentTemplates = await PaperTemplate.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      overview: {
        totalTemplates
      },
      recentTemplates
    });
  } catch (error) {
    console.error('Get paper template stats error:', error);
    res.status(500).json({ error: 'Failed to get paper template statistics' });
  }
};

export {
  createPaperTemplate,
  getPaperTemplates,
  getPaperTemplate,
  updatePaperTemplate,
  deletePaperTemplate,
  getPaperTemplateStats
};
