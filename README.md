# Dating App Backend - Clique

Chào mừng bạn đến với repo Backend của ứng dụng hẹn hò Clique. Dưới đây là mô tả chi tiết về hệ thống, logic xử lý và các định hướng phát triển.

---

## 1. Tổ chức hệ thống (Architecture)

Hệ thống được xây dựng trên nền tảng **Node.js** và **Express.js** với ngôn ngữ **TypeScript**, tuân thủ cấu trúc phân lớp (Layered Architecture) để đảm bảo tính mở rộng và dễ bảo trì:

- **Routes**: Tiếp nhận các request từ phía client và điều hướng đến các Controller tương ứng.
- **Controllers**: Xử lý logic nghiệp vụ tầng giao diện, điều phối các Service và trả về phản hồi chuẩn HTTP.
- **Services**: Lớp chứa logic cốt lõi của ứng dụng (Auth, User, Dating logic). Đảm nhiệm việc tương tác với database thông qua các Model.
- **Models/Schemas**: Định nghĩa cấu trúc dữ liệu bằng Mongoose và các Interface của TypeScript.
- **Middlewares**: Xử lý các tác vụ như xác thực JWT (Authentication), kiểm tra quyền (Authorization), và bắt lỗi tập trung (Error handling).
- **Socket layer**: Cung cấp khả năng giao tiếp thời gian thực cho hệ thống thông báo (Match, Like, Schedule).
- **Utils/Constants**: Các hàm hỗ trợ dùng chung, định nghĩa mã lỗi và hằng số cấu hình.

---

## 2. Lưu trữ dữ liệu (Data Storage)

Ứng dụng sử dụng mô hình dữ liệu **NoSQL** để linh hoạt trong việc lưu trữ thông tin người dùng và các tương tác phức tạp:

- **Database**: **MongoDB** (được triển khai trên MongoDB Atlas).
- **ORM**: **Mongoose** giúp quản lý schema, quan hệ giữa các collection và thực hiện các query phức tạp một cách an toàn.
- **Cloud Storage**: Sử dụng **Cloudinary** để lưu trữ và tối ưu hóa hình ảnh đại diện (avatar) cũng như hình ảnh bài đăng của người dùng.
- **Email Service**: Tích hợp **Resend** để gửi các email xác thực OTP và thông báo quan trọng.

---

## 3. Logic Match (Matching Algorithm)

Hệ thống Match hoạt động dựa trên cơ chế "Love-at-first-swipe" (Tương tác hai chiều):

1. **Like**: Khi người dùng A "Tym" người dùng B, ID của B sẽ được thêm vào mảng `likes` của A, đồng thời ID của A được thêm vào mảng `likedBy` của B.
2. **Notification**: Một thông báo "Like" đơn phương sẽ được gửi qua Webhook/Socket đến người dùng B.
3. **Double-Match**:
   - Hệ thống sẽ liên tục kiểm tra xem người dùng B đã từng "Tym" người dùng A trước đó chưa (A có nằm trong `likedBy` của B không).
   - Nếu có, hệ thống sẽ tự động cập nhật mảng `matches` cho cả hai người.
   - Một thông báo **"It's a Match! 💖"** sẽ được gửi realtime đến cả hai phía qua Socket.io.

---

## 4. Logic Tìm Slot Trùng (Date Scheduling Logic)

Tính năng hẹn hò đi sâu vào việc tự động tìm kiếm khung giờ rảnh chung giữa hai người:

### 4.1. Tìm khoảng giao (Intersection)

Hệ thống sử dụng một thuật toán so sánh các đoạn thời gian (`ITimeSlot`):

- Chuyển đổi thời gian dạng "HH:mm" thành số phút từ đầu ngày để so sánh chính xác.
- Tính toán: `intersectStart = max(startA, startB)` và `intersectEnd = min(endA, endB)`.
- Nếu `intersectEnd - intersectStart >= 30` (phút), hệ thống ghi nhận đây là một khoảng rảnh chung hợp lệ.

### 4.2. Kiểm tra xung đột (Conflict Check)

Trước khi đề xuất khung giờ chung, hệ thống thực hiện kiểm tra chéo với lịch sử:

- Truy vấn các lịch hẹn đã được chốt (`status: 'scheduled'`) của cả hai người trong cùng ngày đó.
- Nếu khung giờ rảnh chung mới tìm được bị đè lên một lịch hẹn đã tồn tại, hệ thống sẽ đưa ra cảnh báo (Warning) cho người dùng biết để cân nhắc.

---

## 5. Cải thiện trong tương lai

Nếu có thêm thời gian, hệ thống sẽ được nâng cấp các tính năng sau:

- **Chat Realtime**: Tích hợp nhắn tin trực tiếp sau khi Match thành công.
- **Advanced Filtering**: Lọc người dùng theo vị trí địa lý (Geo-spatial query), sở thích và mục tiêu hẹn hò.
- **Recommendation Engine**: Sử dụng AI/ML để gợi ý những người có độ tương đồng cao thay vì hiển thị danh sách ngẫu nhiên.
- **Video Call**: Tích hợp WebRTC để cho phép người dùng gặp mặt trực tuyến trước khi quyết định hẹn hò thực tế.
- **Enhanced Security**: Cài đặt Rate Limiting, tối ưu hóa logic OTP và mã hóa dữ liệu nhạy cảm cấp độ cao hơn.
