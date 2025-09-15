import ResourceDoc from '../models/ResourceDoc.js';

// Create new resource document
const createResourceDoc = async (req: any, res: any) => {
  try {
    const { name, url } = req.body;

    const resourceDoc = new ResourceDoc({
      name,
      url
    });

    await resourceDoc.save();

    res.status(201).json({
      message: 'Resource document created successfully',
      resourceDoc
    });
  } catch (error) {
    console.error('Create resource document error:', error);
    res.status(500).json({ error: 'Failed to create resource document' });
  }
};

// Get all resource documents
const getResourceDocs = async (req: any, res: any) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } }
      ];
    }

    const resourceDocs = await ResourceDoc.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await ResourceDoc.countDocuments(query);

    res.json({
      resourceDocs,
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
    console.error('Get resource documents error:', error);
    res.status(500).json({ error: 'Failed to get resource documents' });
  }
};

// Get resource document by ID
const getResourceDoc = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const resourceDoc = await ResourceDoc.findById(id);

    if (!resourceDoc) {
      return res.status(404).json({ error: 'Resource document not found' });
    }

    res.json(resourceDoc);
  } catch (error) {
    console.error('Get resource document error:', error);
    res.status(500).json({ error: 'Failed to get resource document' });
  }
};

// Update resource document
const updateResourceDoc = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, url } = req.body;

    const resourceDoc = await ResourceDoc.findByIdAndUpdate(
      id,
      { name, url },
      { new: true }
    );

    if (!resourceDoc) {
      return res.status(404).json({ error: 'Resource document not found' });
    }

    res.json({
      message: 'Resource document updated successfully',
      resourceDoc
    });
  } catch (error) {
    console.error('Update resource document error:', error);
    res.status(500).json({ error: 'Failed to update resource document' });
  }
};

// Delete resource document
const deleteResourceDoc = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const resourceDoc = await ResourceDoc.findByIdAndDelete(id);
    if (!resourceDoc) {
      return res.status(404).json({ error: 'Resource document not found' });
    }

    res.json({ message: 'Resource document deleted successfully' });
  } catch (error) {
    console.error('Delete resource document error:', error);
    res.status(500).json({ error: 'Failed to delete resource document' });
  }
};

// Get resource document statistics
const getResourceDocStats = async (req: any, res: any) => {
  try {
    const totalDocs = await ResourceDoc.countDocuments();

    const recentDocs = await ResourceDoc.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      overview: {
        totalDocs
      },
      recentDocs
    });
  } catch (error) {
    console.error('Get resource document stats error:', error);
    res.status(500).json({ error: 'Failed to get resource document statistics' });
  }
};

export {
  createResourceDoc,
  getResourceDocs,
  getResourceDoc,
  updateResourceDoc,
  deleteResourceDoc,
  getResourceDocStats
};
