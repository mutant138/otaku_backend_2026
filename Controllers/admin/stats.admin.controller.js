import dbCommonQuery from "../../utils/dbCommonQuery.js";
import Payment from "../../Models/payment.schema.js";

/**
 * Get aggregated Dashboard statistics
 * GET /api/admin/stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      premiumUsers,
      botUsers,
      animeTitles,
      gameTitles,
      animeCategories,
      gameCategories,
      totalPlans,
      totalPaymentsCount,
      pendingReports,
      totalCountries,
      totalCities,
      totalQuizQuestions,
      totalDuels,
    ] = await Promise.all([
      dbCommonQuery({ model: "User", action: "countDocuments", filter: {} }),
      dbCommonQuery({ model: "User", action: "countDocuments", filter: { isPremium: true } }),
      dbCommonQuery({ model: "User", action: "countDocuments", filter: { isBot: true } }),
      dbCommonQuery({ model: "AnimeTitle", action: "countDocuments", filter: {} }),
      dbCommonQuery({ model: "GameTitle", action: "countDocuments", filter: {} }),
      dbCommonQuery({ model: "AnimeCategory", action: "countDocuments", filter: {} }),
      dbCommonQuery({ model: "GameCategory", action: "countDocuments", filter: {} }),
      dbCommonQuery({ model: "Plan", action: "countDocuments", filter: {} }),
      dbCommonQuery({ model: "Payment", action: "countDocuments", filter: {} }),
      dbCommonQuery({ model: "Report", action: "countDocuments", filter: {} }),
      dbCommonQuery({ model: "Country", action: "countDocuments", filter: {} }),
      dbCommonQuery({ model: "City", action: "countDocuments", filter: {} }),
      dbCommonQuery({ model: "QuizQuestion", action: "countDocuments", filter: {} }),
      dbCommonQuery({ model: "DuelHistory", action: "countDocuments", filter: {} }),
    ]);

    // Calculate total verified revenue (in INR)
    const revenueResult = await Payment.aggregate([
      { $match: { status: "verified" } },
      { $group: { _id: null, totalPaise: { $sum: "$amount" } } },
    ]);
    const totalRevenueInr = revenueResult.length > 0 ? Math.round(revenueResult[0].totalPaise / 100) : 0;

    // Recent 5 users
    const recentUsers = await dbCommonQuery({
      model: "User",
      action: "find",
      filter: {},
      projection: "fullname username email avatar isVerified isPremium role createdAt",
      sort: { createdAt: -1 },
      limit: 5,
      lean: true,
    });

    // Recent 5 payments
    const recentPayments = await dbCommonQuery({
      model: "Payment",
      action: "find",
      filter: {},
      populate: { path: "user", select: "fullname username email" },
      sort: { createdAt: -1 },
      limit: 5,
      lean: true,
    });

    // Recent 5 reports
    const recentReports = await dbCommonQuery({
      model: "Report",
      action: "find",
      filter: {},
      populate: [
        { path: "reporter", select: "fullname username email avatar" },
        { path: "reportedUser", select: "fullname username email avatar" },
      ],
      sort: { createdAt: -1 },
      limit: 5,
      lean: true,
    });

    return res.status(200).json({
      status: true,
      data: {
        counts: {
          totalUsers,
          premiumUsers,
          botUsers,
          animeTitles,
          gameTitles,
          animeCategories,
          gameCategories,
          totalPlans,
          totalPaymentsCount,
          pendingReports,
          totalCountries,
          totalCities,
          totalRevenueInr,
          totalQuizQuestions,
          totalDuels,
        },
        recentUsers,
        recentPayments,
        recentReports,
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve dashboard statistics.",
    });
  }
};
