const BannerSlider = require('../models/Bannerslider');

// GET /api/banner-sliders
const getBannerSliders = async (req, res) => {
  try {
    const banners = await BannerSlider.find().sort({ order: 1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch banner sliders', error: err.message });
  }
};

// POST /api/banner-sliders
const createBannerSlider = async (req, res) => {
  try {
    const { title, image, order, isActive } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const banner = await BannerSlider.create({
      title,
      image,
      order,
      isActive
    });

    res.status(201).json(banner);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create banner slider', error: err.message });
  }
};

// PUT /api/banner-sliders/:id
const updateBannerSlider = async (req, res) => {
  try {
    const banner = await BannerSlider.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({ message: 'Banner slide not found' });
    }

    const { title, image, order, isActive } = req.body;

    if (title !== undefined) banner.title = title;
    if (image !== undefined) banner.image = image;
    if (order !== undefined) banner.order = order;
    if (isActive !== undefined) banner.isActive = isActive;

    const updated = await banner.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update banner slider', error: err.message });
  }
};

// PATCH /api/banner-sliders/:id  (used for the quick active/inactive toggle)
const patchBannerSlider = async (req, res) => {
  try {
    const banner = await BannerSlider.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({ message: 'Banner slide not found' });
    }

    Object.assign(banner, req.body);
    const updated = await banner.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update banner slider', error: err.message });
  }
};

// DELETE /api/banner-sliders/:id
const deleteBannerSlider = async (req, res) => {
  try {
    const banner = await BannerSlider.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({ message: 'Banner slide not found' });
    }

    await banner.deleteOne();
    res.json({ message: 'Banner slide deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete banner slider', error: err.message });
  }
};

module.exports = {
  getBannerSliders,
  createBannerSlider,
  updateBannerSlider,
  patchBannerSlider,
  deleteBannerSlider
};