const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const contactChecker = async (req, res) => {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).json({
            message: "At least one of email or phoneNumber must be provided.",
        });
    }

    let existingContacts = await prisma.contact.findMany({
        where: {
            OR: [
                { email: email || undefined },
                { phoneNumber: phoneNumber || undefined },
            ],
        },
        orderBy: { createdAt: "asc" },
    });

    if (existingContacts.length === 0) {
        const newContact = await prisma.contact.create({
            data: {
                email,
                phoneNumber,
                linkPrecedence: "primary",
            },
        });
        return res.status(200).json({
            contact: {
                primaryContactId: newContact.id,
                emails: email ? [email] : [],
                phoneNumbers: phoneNumber ? [phoneNumber] : [],
                secondaryContactIds: [],
            },
        });
    }

    // the oldest one
    let primaryContact = existingContacts[0];

    let needNewSecondary = true;

    // email and phone number already exist toh nhi karta
    for (let i = 0; i < existingContacts.length; i++) {
        const contact = existingContacts[i];
        if (
            email &&
            contact.email === email &&
            phoneNumber &&
            contact.phoneNumber === phoneNumber
        ) {
            needNewSecondary = false;
            break;
        }
    }

    if (needNewSecondary) {
        const newSecondary = await prisma.contact.create({
            data: {
                email,
                phoneNumber,
                linkedId: primaryContact.id,
                linkPrecedence: "secondary",
            },
        });
        existingContacts.push(newSecondary);
    }

    // Saare contacts ko secondary mark kar raha hain except primary waale ke
    for (let contact of existingContacts) {
        if (contact.id !== primaryContact.id) {
            await prisma.contact.update({
                where: { id: contact.id },
                data: {
                    linkedId: primaryContact.id,
                    linkPrecedence: "secondary",
                },
            });
        }
    }

    // Saare related contacts -> primary id se
    const allRelatedContacts = await prisma.contact.findMany({
        where: {
            OR: [{ id: primaryContact.id }, { linkedId: primaryContact.id }],
        },
        orderBy: { createdAt: "asc" },
    });

    // Saare different emails same primaryContact id waale
    const emails = [];
    allRelatedContacts.map((c) => {
        if (c.email && !emails.includes(c.email)) {
            emails.push(c.email);
        }
    });

    // Saare different phoneNumbers same primaryContact id waale
    const phoneNumbers = [];
    allRelatedContacts.map((c) => {
        if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber)) {
            phoneNumbers.push(c.phoneNumber);
        }
    });

    // Saari secondary contact IDs
    const secondaryContactIds = [];
    allRelatedContacts.map((c) => {
        if (c.id !== primaryContact.id) {
            secondaryContactIds.push(c.id);
        }
    });

    return res.status(200).json({
        contact: {
            primaryContactId: primaryContact.id,
            emails,
            phoneNumbers,
            secondaryContactIds,
        },
    });
};

module.exports = { contactChecker };
