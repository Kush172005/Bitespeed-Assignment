const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const contactChecker = async (req, res) => {
    try {
        const { email, phoneNumber } = req.body;

        if (!email && !phoneNumber) {
            return res.status(400).json({
                message:
                    "At least one of email or phoneNumber must be provided.",
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

        let primaryContact = existingContacts[0];

        let needNewSecondary = true;

        let emailContact = existingContacts.find((c) => c.email === email);
        let phoneContact = existingContacts.find(
            (c) => c.phoneNumber === phoneNumber
        );

        if (
            emailContact &&
            phoneContact &&
            emailContact.id !== phoneContact.id
        ) {
            needNewSecondary = false;

            if (phoneContact.createdAt < emailContact.createdAt) {
                primaryContact = phoneContact;
            } else {
                primaryContact = emailContact;
            }
        } else {
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

        const allRelatedContacts = await prisma.contact.findMany({
            where: {
                OR: [
                    { id: primaryContact.id },
                    { linkedId: primaryContact.id },
                ],
            },
            orderBy: { createdAt: "asc" },
        });

        const emails = [];
        allRelatedContacts.map((c) => {
            if (c.email && !emails.includes(c.email)) {
                emails.push(c.email);
            }
        });

        const phoneNumbers = [];
        allRelatedContacts.map((c) => {
            if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber)) {
                phoneNumbers.push(c.phoneNumber);
            }
        });

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
    } catch (error) {
        return res.status(500).json({
            message: "An unexpected error occurred.",
            error: error.message,
        });
    }
};

module.exports = { contactChecker };
