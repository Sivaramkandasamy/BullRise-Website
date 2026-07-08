const ExclusiveBanner = require('../models/ExclusiveBanner');

// @desc    Get all exclusive banners
// @route   GET /api/exclusive-banners
// @access  Public
const getExclusiveBanners = async (req, res) => {
  try {
    const banners = await ExclusiveBanner.find({}).sort({ order: 1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single exclusive banner
// @route   GET /api/exclusive-banners/:id
// @access  Public
const getExclusiveBannerById = async (req, res) => {
  try {
    const banner = await ExclusiveBanner.findById(req.params.id);

    if (banner) {
      res.json(banner);
    } else {
      res.status(404).json({ message: 'Banner not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a exclusive banner
// @route   POST /api/exclusive-banners
// @access  Private/Admin
const createExclusiveBanner = async (req, res) => {
  try {
    const { title, subtitle, image, link, order, isActive } = req.body;

    const banner = new ExclusiveBanner({
      title,
      subtitle,
      image,
      link,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    const createdBanner = await banner.save();
    res.status(201).json(createdBanner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a exclusive banner
// @route   PUT /api/exclusive-banners/:id
// @access  Private/Admin
const updateExclusiveBanner = async (req, res) => {
  try {
    const { title, subtitle, image, link, order, isActive } = req.body;

    const banner = await ExclusiveBanner.findById(req.params.id);

    if (banner) {
      banner.title = title || banner.title;
      banner.subtitle = subtitle || banner.subtitle;
      banner.image = image || banner.image;
      banner.link = link || banner.link;
      banner.order = order !== undefined ? order : banner.order;
      banner.isActive = isActive !== undefined ? isActive : banner.isActive;

      const updatedBanner = await banner.save();
      res.json(updatedBanner);
    } else {
      res.status(404).json({ message: 'Banner not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a exclusive banner
// @route   DELETE /api/exclusive-banners/:id
// @access  Private/Admin
const deleteExclusiveBanner = async (req, res) => {
  try {
    const banner = await ExclusiveBanner.findById(req.params.id);

    if (banner) {
      await banner.deleteOne();
      res.json({ message: 'Banner removed' });
    } else {
      res.status(404).json({ message: 'Banner not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle banner status
// @route   PATCH /api/exclusive-banners/:id
// @access  Private/Admin
const toggleExclusiveBannerStatus = async (req, res) => {
  try {
    const banner = await ExclusiveBanner.findById(req.params.id);

    if (banner) {
      banner.isActive = !banner.isActive;
      const updatedBanner = await banner.save();
      res.json(updatedBanner);
    } else {
      res.status(404).json({ message: 'Banner not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getExclusiveBanners,
  getExclusiveBannerById,
  createExclusiveBanner,
  updateExclusiveBanner,
  deleteExclusiveBanner,
  toggleExclusiveBannerStatus
};
