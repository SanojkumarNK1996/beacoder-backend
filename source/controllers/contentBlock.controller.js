const ContentBlocks = require("../models/ContentTable.model");
const Subtopics = require("../models/Subtopics.model");
const sanitizeHtml = require("sanitize-html");

// ✅ Create Content Block
const createContentBlock = async (req, res) => {
    try {
        const { subtopicId } = req.params;
        const contentBlocks = req.body; 

        if (!Array.isArray(contentBlocks) || contentBlocks.length === 0) {
            return res.status(400).json({
                statusCode: 400,
                message: "An array of content blocks is required.",
            });
        }

        const subtopic = await Subtopics.findOne({ where: { id: subtopicId } });
        if (!subtopic) {
            return res.status(404).json({ message: "Subtopic not found." });
        }

        const createdBlocks = [];
        for (const block of contentBlocks) {
            const { displayOrder, dataType, title, data } = block;

            if (!displayOrder || !dataType || !data) {
                return res.status(400).json({
                    statusCode: 400,
                    message: "displayOrder, dataType, and data are required for each block.",
                });
            }

            // Type-specific validations
            if (dataType === "youtube_video" && !data.videoUrl) {
                return res.status(400).json({ message: "videoUrl is required for youtube_video type." });
            }
            if (dataType === "notes") {
                if (!data.description) {
                    return res.status(400).json({ message: "description is required for notes type." });
                }

                // Sanitize the HTML description to avoid XSS and strip unwanted tags/attributes.
                // Allowed tags include headings, paragraphs, lists, pre/code for code blocks, links, basic formatting.
                data.description = sanitizeHtml(data.description, {
                    allowedTags: [
                        "h1","h2","h3","h4","h5","h6",
                        "p","ul","ol","li","br",
                        "pre","code","strong","em","b","i","u",
                        "a","span","div"
                    ],
                    allowedAttributes: {
                        a: ["href", "name", "target", "rel"],
                        // allow classes on code/span if you use styling classes client-side
                        "*": ["class"]
                    },
                    allowedSchemes: ["http","https","mailto"],
                    // preserve whitespace inside <pre><code>
                    nonTextTags: ["style", "script", "textarea", "noscript"]
                });
            }
            if (dataType === "mcq_set" && (!data.questions || !Array.isArray(data.questions))) {
                return res.status(400).json({ message: "questions array is required for mcq_set type." });
            }

            const createdBlock = await ContentBlocks.create({
                displayOrder,
                dataType,
                title,
                data,
                subtopicId,
            });
            createdBlocks.push(createdBlock);
        }

        return res.status(201).json({
            statusCode: 201,
            message: "Content blocks created successfully.",
            data: createdBlocks,
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            message: "Failed to create content blocks.",
            error: error.message,
        });
    }
};

// ✅ Get All Content Blocks by Subtopic
const getContentBlocksBySubtopic = async (req, res) => {
    try {
        const { subtopicId } = req.params;

        const subtopic = await Subtopics.findOne({ where: { id: subtopicId } });
        if (!subtopic) {
            return res.status(404).json({ message: "Subtopic not found." });
        }

        const contentBlocks = await ContentBlocks.findAll({
            where: { subtopicId },
            order: [["displayOrder", "ASC"]],
        });

        return res.status(200).json({
            statusCode: 200,
            message: "Content blocks fetched successfully.",
            data: contentBlocks,
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            message: "Failed to fetch content blocks.",
            error: error.message,
        });
    }
};

// ✅ Get Content Block by ID
const getContentBlockById = async (req, res) => {
    try {
        const { contentId } = req.params;
        const contentBlock = await ContentBlocks.findByPk(contentId);

        if (!contentBlock) {
            return res.status(404).json({
                statusCode: 404,
                message: "Content block not found.",
            });
        }

        return res.status(200).json({
            statusCode: 200,
            message: "Content block fetched successfully.",
            data: contentBlock,
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            message: "Failed to fetch content block.",
            error: error.message,
        });
    }
};

// ✅ Update Content Block
const updateContentBlock = async (req, res) => {
    try {
        const { contentId } = req.params;
        const { displayOrder, dataType, title, data, isActive } = req.body;

        const block = await ContentBlocks.findByPk(contentId);
        if (!block) return res.status(404).json({ message: "Content block not found" });

        // Type-specific validation if dataType or data is updated
        if (dataType === "youtube_video" && data && !data.videoUrl) {
            return res.status(400).json({ message: "videoUrl is required for youtube_video type." });
        }
        if (dataType === "notes" && data) {
            if (!data.description) {
                return res.status(400).json({ message: "description is required for notes type." });
            }

            // Sanitize incoming HTML description
            data.description = sanitizeHtml(data.description, {
                allowedTags: [
                    "h1","h2","h3","h4","h5","h6",
                    "p","ul","ol","li","br",
                    "pre","code","strong","em","b","i","u",
                    "a","span","div"
                ],
                allowedAttributes: {
                    a: ["href", "name", "target", "rel"],
                    "*": ["class"]
                },
                allowedSchemes: ["http","https","mailto"],
                nonTextTags: ["style", "script", "textarea", "noscript"]
            });
        }
        if (dataType === "mcq_set" && data && (!data.questions || !Array.isArray(data.questions))) {
            return res.status(400).json({ message: "questions array is required for mcq_set type." });
        }

        await block.update({
            displayOrder: displayOrder !== undefined ? displayOrder : block.displayOrder,
            dataType: dataType || block.dataType,
            title: title !== undefined ? title : block.title,
            data: data || block.data,
            isActive: isActive !== undefined ? isActive : block.isActive,
        });

        return res.status(200).json({
            statusCode: 200,
            message: "Content block updated successfully.",
            data: block,
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            message: "Failed to update content block.",
            error: error.message,
        });
    }
};

// ✅ Delete Content Block
const deleteContentBlock = async (req, res) => {
    try {
        const { contentId } = req.params;
        const contentBlock = await ContentBlocks.findByPk(contentId);

        if (!contentBlock) {
            return res.status(404).json({
                statusCode: 404,
                message: "Content block not found.",
            });
        }

        await contentBlock.destroy();

        return res.status(200).json({
            statusCode: 200,
            message: "Content block deleted successfully.",
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            message: "Failed to delete content block.",
            error: error.message,
        });
    }
};

module.exports = {
    createContentBlock,
    getContentBlocksBySubtopic,
    getContentBlockById,
    updateContentBlock,
    deleteContentBlock,
};