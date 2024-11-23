const { prismaClient } = require("../config/database");

const contactChecker = async (req, res) => {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).json({
            message: "At least one of email or phoneNumber must be provided.",
        });
    }

    const contacts = await prismaClient.contact.findMany({
        where: {
            OR: [{ email: email }, { phoneNumber: phoneNumber }],
        },
        orderBy: { createdAt: "asc" },
    });

    if (contacts.length === 0) {
        const newContact = await prismaClient.contact.create({
            data: {
                email,
                phoneNumber,
                linkPrecedence: "primary",
            },
        });
        return res.status(200).json({ message: newContact });
    }

    return res.status(200).json({ message: "User Already exists", contacts });
};

module.exports = { contactChecker };
