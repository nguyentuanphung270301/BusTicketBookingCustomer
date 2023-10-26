import ContentPasteSearchOutlinedIcon from "@mui/icons-material/ContentPasteSearchOutlined";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Modal,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { compareAsc, format, isAfter, parse } from "date-fns";
import { debounce } from "lodash";
import React, { useEffect, useState } from "react";
import * as bookingApi from "../../queries/booking/ticketQueries";
import { tokens } from "../../theme";
import { APP_CONSTANTS } from "../../utils/appContants";
import { messages } from "../../utils/validationMessages";

const getFormattedPaymentDateTime = (paymentDateTime) => {
  return format(
    parse(paymentDateTime, "yyyy-MM-dd HH:mm:ss", new Date()),
    "HH:mm:ss dd/MM/yyyy"
  );
};

const getBookingPrice = (trip) => {
  let finalPrice = trip.price;
  if (!isNaN(trip?.discount?.amount)) {
    finalPrice -= trip.discount.amount;
  }
  return finalPrice;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const MyTicket = () => {
  const colors = tokens();
  const [openModal, setOpenModal] = useState(false);
  const [isInValidPhone, setIsInValidPhone] = useState(false);
  const [sortedTickets, setSortedTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(-1);
  const loggedInUsername = localStorage.getItem("loggedInUsername");
  const queryClient = useQueryClient();

  const bookingSearchQuery = useQuery({
    queryKey: ["bookings", "all", "user", loggedInUsername],
    queryFn: () => bookingApi.getAllByUsername(loggedInUsername),
    enabled: loggedInUsername !== "",
  });

  const bookingDetailQuery = useQuery({
    queryKey: ["bookings", selectedTicket],
    queryFn: () => bookingApi.getBooking(selectedTicket),
    enabled: selectedTicket >= 0,
  });

  const sortTickets = (ticketList) => {
    if (ticketList?.length === 0) return ticketList;

    const compareByDepartureDateTimeAsc = (a, b) => {
      const aDateTime = a.trip.departureDateTime;
      const bDateTime = b.trip.departureDateTime;
      return compareAsc(bDateTime, aDateTime);
    };

    // sort desc
    ticketList.sort(compareByDepartureDateTimeAsc);

    return ticketList;
  };

  const getPaymentStatusObject = (paymentStatus) => {
    switch (paymentStatus) {
      case "UNPAID":
        return { title: "Chưa thanh toán", color: "warning" };
      case "PAID":
        return { title: "Đã thanh toán", color: "success" };
      case "CANCEL":
        return { title: "Đã hủy vé", color: "info" };
    }
  };

  const getStatusText = (historyStatus) => {
    if (historyStatus === null) return "Tạo mới";
    switch (historyStatus) {
      case "UNPAID":
        return "Chưa thanh toán";
      case "PAID":
        return "Đã thanh toán";
      case "CANCEL":
        return "Đã hủy vé";
    }
  };

  // filter and sort booking date desc
  useEffect(() => {
    const newTickets = sortTickets(bookingSearchQuery?.data ?? []);
    setSortedTickets(newTickets);
  }, [bookingSearchQuery.data]);

  return (
    <Box
      mt="100px"
      display="flex"
      flexDirection="column"
      gap="20px"
      alignItems="center"
    >
      <Typography variant="h2" fontWeight="bold">
        Vé của bạn
      </Typography>
      {bookingSearchQuery?.data ? (
        sortedTickets.length !== 0 ? (
          <Box
            display="grid"
            gridTemplateColumns="repeat(12, 1fr)"
            gap="30px"
            p="50px"
            sx={{
              width: "100%",
              position: "relative",
              overflow: "auto",
              maxHeight: 400,
            }}
          >
            {sortedTickets.map((booking) => {
              const { trip, bookingDateTime, seatNumber, paymentStatus } =
                booking;
              return (
                <Card
                  key={booking.id}
                  onClick={() => {
                    setSelectedTicket(booking.id);
                    setOpenModal(!openModal);
                  }}
                  elevation={0}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gridColumn: "span 6",
                    cursor: "pointer",
                    padding: "0 20px",
                  }}
                >
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                  >
                    <CardContent
                      sx={{
                        display: "flex",
                        gap: "20px",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box>
                        <Typography component="span" variant="h6">
                          <span style={{ fontWeight: "bold" }}>Tuyến: </span>
                          {`${trip.source.name}
                           ${`\u21D2`}
                         ${trip.destination.name}`}
                        </Typography>
                        <Typography variant="h6">
                          {" "}
                          <span style={{ fontWeight: "bold" }}>Xe: </span>
                          {trip.coach.coachType}
                        </Typography>
                        <Typography variant="h6">
                          <span style={{ fontWeight: "bold" }}>Ngày đi: </span>{" "}
                          {format(
                            parse(
                              trip.departureDateTime,
                              "yyyy-MM-dd HH:mm",
                              new Date()
                            ),
                            "HH:mm dd-MM-yyyy"
                          )}
                        </Typography>
                        <Typography variant="h6">
                          <span style={{ fontWeight: "bold" }}>Ghế: </span>
                          {seatNumber}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="end" alignItems="end">
                        <Chip
                          label={getPaymentStatusObject(paymentStatus)?.title}
                          color={getPaymentStatusObject(paymentStatus)?.color}
                        />
                      </Box>
                    </CardContent>
                  </Box>
                </Card>
              );
            })}
          </Box>
        ) : (
          // no result
          <Box
            p="100px"
            display="flex"
            flexDirection="column"
            gap="10px"
            justifyContent="center"
            alignItems="center"
          >
            <ContentPasteSearchOutlinedIcon
              sx={{
                width: "150px",
                height: "150px",
                color: colors.greyAccent[500],
              }}
            />
            <Typography
              color={colors.greyAccent[500]}
              variant="h2"
              fontWeight="bold"
            >
              Không có kết quả
            </Typography>
          </Box>
        )
      ) : undefined}

      {/* Ticket detail modal */}
      <Modal
        sx={{
          "& .MuiBox-root": {
            bgcolor: colors.primary[100],
          },
        }}
        open={openModal}
        onClose={() => setOpenModal(!openModal)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            borderRadius: "10px",
            boxShadow: 24,
            p: 4,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px",
          }}
        >
          {/* ticket info */}
          <Box display="flex" alignItems="center">
            {bookingDetailQuery?.data && (
              <>
                <Box>
                  <Typography mb="40px" variant="h3" fontWeight="bold">
                    THÔNG TIN VÉ ĐẶT
                  </Typography>
                  <Typography component="span" variant="h6">
                    <span style={{ fontWeight: "bold" }}>Tuyến: </span>
                    {`${bookingDetailQuery.data.trip.source.name}
                           ${`\u21D2`}
                         ${bookingDetailQuery.data.trip.destination.name}`}
                  </Typography>
                  <Typography variant="h6">
                    {" "}
                    <span style={{ fontWeight: "bold" }}>Xe: </span>
                    {`${bookingDetailQuery.data.trip.coach.name} ${bookingDetailQuery.data.trip.coach.coachType}`}
                  </Typography>
                  <Typography variant="h6">
                    <span style={{ fontWeight: "bold" }}>Ngày giờ đi: </span>{" "}
                    {format(
                      parse(
                        bookingDetailQuery.data.trip.departureDateTime,
                        "yyyy-MM-dd HH:mm",
                        new Date()
                      ),
                      "HH:mm dd-MM-yyyy"
                    )}
                  </Typography>
                  <Typography variant="h6">
                    <span style={{ fontWeight: "bold" }}>Giá vé: </span>
                    {`${formatCurrency(
                      getBookingPrice(bookingDetailQuery.data.trip)
                    )}`}
                  </Typography>
                  <Typography variant="h6">
                    <span style={{ fontWeight: "bold" }}>Ghế: </span>
                    {bookingDetailQuery.data.seatNumber}
                  </Typography>
                </Box>
                <Box
                  display="grid"
                  gridTemplateColumns="repeat(4, 1fr)"
                  gap="15px"
                >
                  <Divider sx={{ gridColumn: "span 4" }}>
                    Thông tin hành khách
                  </Divider>
                  <TextField
                    color="warning"
                    size="small"
                    fullWidth
                    variant="outlined"
                    type="text"
                    label="Họ"
                    value={bookingDetailQuery.data.custFirstName}
                    name="custFirstName"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{
                      gridColumn: "span 2",
                    }}
                  />
                  <TextField
                    color="warning"
                    size="small"
                    fullWidth
                    variant="outlined"
                    type="text"
                    label="Tên"
                    value={bookingDetailQuery.data.custLastName}
                    name="custLastName"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{
                      gridColumn: "span 2",
                    }}
                  />
                  <TextField
                    color="warning"
                    size="small"
                    fullWidth
                    variant="outlined"
                    type="text"
                    label="Số điện thoại"
                    value={bookingDetailQuery.data.phone}
                    name="phone"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{
                      gridColumn: "span 2",
                    }}
                  />
                  <TextField
                    color="warning"
                    size="small"
                    fullWidth
                    variant="outlined"
                    type="text"
                    label="Email"
                    value={bookingDetailQuery.data.email ?? "Không có"}
                    name="email"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{
                      gridColumn: "span 2",
                    }}
                  />
                  <TextField
                    color="warning"
                    size="small"
                    fullWidth
                    variant="outlined"
                    type="text"
                    label="Địa chỉ đón"
                    value={bookingDetailQuery.data.pickUpAddress}
                    name="pickUpAddress"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{
                      gridColumn: "span 4",
                    }}
                  />
                  <Divider sx={{ gridColumn: "span 4", mt: "20px" }}>
                    Thông tin thanh toán
                  </Divider>
                  <TextField
                    color="warning"
                    size="small"
                    fullWidth
                    variant="outlined"
                    type="text"
                    label="Phương thức thanh toán"
                    value={
                      bookingDetailQuery.data.paymentMethod === "CASH"
                        ? "Tiền mặt"
                        : "Thẻ visa"
                    }
                    name="paymentMethod"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{
                      gridColumn: "span 2",
                    }}
                  />
                  <TextField
                    color="warning"
                    size="small"
                    fullWidth
                    variant="outlined"
                    type="text"
                    label="Trạng thái thanh toán"
                    value={
                      bookingDetailQuery.data.paymentStatus === "UNPAID"
                        ? "Chưa thanh toán"
                        : bookingDetailQuery.data.paymentStatus === "PAID"
                        ? "Đã thanh toán"
                        : " Đã hủy vé"
                    }
                    name="paymentStatus"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{
                      gridColumn: "span 2",
                    }}
                  />
                  <TextField
                    color="warning"
                    size="small"
                    fullWidth
                    variant="outlined"
                    type="text"
                    label="Ngày thanh toán"
                    value={getFormattedPaymentDateTime(
                      bookingDetailQuery.data.paymentDateTime
                    )}
                    name="paymentDateTime"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{
                      gridColumn: "span 2",
                    }}
                  />
                  <TextField
                    color="warning"
                    size="small"
                    fullWidth
                    variant="outlined"
                    type="text"
                    label="Tổng tiền thanh toán"
                    value={formatCurrency(bookingDetailQuery.data.totalPayment)}
                    name="totalPayment"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{
                      gridColumn: "span 2",
                    }}
                  />
                </Box>
              </>
            )}
          </Box>
          <Divider sx={{ width: "100%" }}>Lịch sử thanh toán</Divider>
          {/* payment history */}
          <Box>
            {bookingDetailQuery?.data && (
              <Box maxHeight="150px" overflow="auto">
                {bookingDetailQuery.data.paymentHistories
                  .toReversed()
                  .map((history, index) => {
                    const { oldStatus, newStatus, statusChangeDateTime } =
                      history;
                    return (
                      <Box p="5px" textAlign="center" key={index}>
                        <Typography>{`${format(
                          parse(
                            statusChangeDateTime,
                            "yyyy-MM-dd HH:mm:ss",
                            new Date()
                          ),
                          "HH:mm:ss dd/MM/yyyy"
                        )}`}</Typography>
                        <Typography mt="4px" fontWeight="bold" variant="h5">
                          {`${getStatusText(oldStatus)} \u21D2 ${getStatusText(
                            newStatus
                          )}`}
                        </Typography>
                      </Box>
                    );
                  })}
              </Box>
            )}
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default MyTicket;
