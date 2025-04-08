const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});
// Deserialize user
passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                portfolio: {
                    include: {
                        holdings: {
                            include: {
                                asset: true
                            }
                        }
                    }
                },
                transactions: {
                    include: {
                        pair: {
                            include: {
                                base: true,
                                quote: true
                            }
                        }
                    }
                }
            }
        });
        done(null, user);
    } catch (error) {
        console.error('Error deserializing user:', error);
        done(error, null);
    }
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.NODE_ENV === 'production' 
                ? 'https://moneytrail.it/auth/google/callback'
                : '/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done ) => {
            try {
                // Check if the profile contains the necessary information
                if (!profile || !profile.emails) {
                    return done(new Error('Invalid profile information from Google'), null);
                }

                const existingUser = await prisma.user.findUnique({
                    where: { googleId: profile.id },
                });

                if (existingUser) {
                    
                    return done(null, existingUser);
                }

                // Check if the user has already registered with the same email
                const manualUser = await prisma.user.findUnique({
                    where: { email: profile.emails[0].value }
                });

                if (manualUser) {
                    // Update user adding his google informations
                    await prisma.user.update({
                        where: { id: manualUser.id },
                        data: {
                            googleId: profile.id,
                            profilePicture: profile.photos?.[0]?.value
                        }
                    });

                    return done(null, manualUser);
                    
                }

                const newUser = await prisma.$transaction(async (tx) => {
                    // Create user with portfolio in transaction
                    const user = await tx.user.create({
                    
                        data: {
                            googleId: profile.id,
                            email: profile.emails[0].value,
                            name: profile.displayName,
                            profilePicture: profile.photos?.[0]?.value,
                            emailVerified: true,
                            verificationToken: null,
                            password: null,
                            completedOnboarding: false

                        }
                    });

                    // Create portfolio for the user
                    await tx.portfolio.create({
                        data: {
                            userId: user.id,
                        }
                    });


                    return user;
                });

                done(null, newUser);

            } catch (error) {
                done(error, null);
            }
        }
    )
);