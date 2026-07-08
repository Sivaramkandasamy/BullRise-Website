const HeroBanner = require('../models/HeroBanner');

// @desc    Get all hero banners
// @route   GET /api/hero-banners
// @access  Public
const getHeroBanners = async (req, res) => {
  try {
    const banners = await HeroBanner.find({}).sort({ order: 1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single hero banner
// @route   GET /api/hero-banners/:id
// @access  Public
const getHeroBannerById = async (req, res) => {
  try {
    const banner = await HeroBanner.findById(req.params.id);

    if (banner) {
      res.json(banner);
    } else {
      res.status(404).json({ message: 'Banner not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a hero banner
// @route   POST /api/hero-banners
// @access  Private/Admin
const createHeroBanner = async (req, res) => {
  try {
    const { title, subtitle, image, ctaPrimaryLabel, ctaPrimaryLink, order, isActive } = req.body;

    const banner = new HeroBanner({
      title,
      subtitle,
      image,
      ctaPrimaryLabel,
      ctaPrimaryLink,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    const createdBanner = await banner.save();
    res.status(201).json(createdBanner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a hero banner
// @route   PUT /api/hero-banners/:id
// @access  Private/Admin
const updateHeroBanner = async (req, res) => {
  try {
    const { title, subtitle, image, ctaPrimaryLabel, ctaPrimaryLink, order, isActive } = req.body;

    const banner = await HeroBanner.findById(req.params.id);

    if (banner) {
      banner.title = title || banner.title;
      banner.subtitle = subtitle || banner.subtitle;
      banner.image = image || banner.image;
      banner.ctaPrimaryLabel = ctaPrimaryLabel || banner.ctaPrimaryLabel;
      banner.ctaPrimaryLink = ctaPrimaryLink !== undefined ? ctaPrimaryLink : banner.ctaPrimaryLink;
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

// @desc    Delete a hero banner
// @route   DELETE /api/hero-banners/:id
// @access  Private/Admin
const deleteHeroBanner = async (req, res) => {
  try {
    const banner = await HeroBanner.findById(req.params.id);

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
// @route   PATCH /api/hero-banners/:id
// @access  Private/Admin
const toggleHeroBannerStatus = async (req, res) => {
  try {
    const banner = await HeroBanner.findById(req.params.id);

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
  getHeroBanners,
  getHeroBannerById,
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
  toggleHeroBannerStatus
};