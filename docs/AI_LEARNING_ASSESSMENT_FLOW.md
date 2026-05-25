# Luồng AI Hỗ Trợ Đánh Giá Kết Quả Học Tập

## 1. Mục tiêu

Tài liệu này mô tả luồng AI của hệ thống theo đúng định hướng đề tài:

**“Xây dựng hệ thống trực tuyến tích hợp AI hỗ trợ đánh giá kết quả học tập của sinh viên”**

Mục tiêu của hệ thống không chỉ là dự đoán điểm, mà còn phải:

- đánh giá mức độ đạt được của sinh viên sau khi làm bài
- xác định chương hoặc mảng kiến thức mà sinh viên còn yếu
- đưa ra nhận xét học tập có định hướng
- đề xuất cách ôn tập phù hợp
- sử dụng dự báo điểm như một chỉ số tham khảo bổ sung

## 2. Hệ thống hiện tại có áp dụng KNN không?

### 2.1. Câu trả lời ngắn gọn

**Hiện tại hệ thống chưa áp dụng KNN.**

### 2.2. Hệ thống đang dùng mô hình gì?

Trong phiên bản hiện tại, hệ thống sử dụng hai tầng xử lý:

1. **Tầng 1: mô hình dự báo điểm bằng toán học/hồi quy**
   - chạy nội bộ trong backend
   - không gọi AI sinh ngôn ngữ
   - sử dụng GPA, điểm các môn đã học, trọng số mô hình, hệ số tương quan, thống kê lớp
   - đầu ra là điểm dự báo, xếp loại dự báo, percentile, so sánh với trung bình lớp

2. **Tầng 2: MiniMax**
   - không dùng để tính điểm dự báo gốc
   - dùng để tạo nhận xét học tập
   - giải thích điểm mạnh, điểm yếu
   - đưa ra lời khuyên ôn tập

### 2.3. “Mô hình hồi quy/thống kê đã huấn luyện sẵn” nghĩa là gì?

Nói đơn giản, hệ thống đang làm theo cách sau:

#### a. Bước huấn luyện ngoại tuyến

Hệ thống đọc dữ liệu điểm của lớp đã có sẵn, ví dụ:

- điểm các môn đã học của từng sinh viên
- GPA của từng sinh viên
- thống kê trung bình lớp theo từng môn

Sau đó, với **mỗi môn cần dự báo**, hệ thống huấn luyện **một mô hình riêng**.

Ví dụ:

- muốn dự báo môn `Xác suất thống kê`
- hệ thống nhìn vào dữ liệu cũ để xem:
  - GPA ảnh hưởng thế nào đến môn này
  - môn `Giải tích`, `Đại số`, `Lập trình` có liên quan thế nào đến môn này
  - môn nào có tương quan mạnh nhất với môn cần dự báo

Kết quả của bước này là tạo ra một file trọng số đã học, tên là:

- `BackEnd/server/src/data/model_weights.json`

#### b. Dữ liệu lưu trong mô hình đã huấn luyện

Trong file trọng số, mỗi môn sẽ có các thông tin như:

- `intercept`: hệ số chặn
- `coeffs`: các hệ số của GPA và các môn liên quan
- `r2`: độ phù hợp của mô hình
- `top_correlations`: các môn tương quan mạnh nhất với môn mục tiêu

Nói dễ hiểu:

- hệ thống không “đoán mò”
- nó dùng các hệ số đã rút ra từ dữ liệu điểm lịch sử

#### c. Khi dự báo cho một sinh viên mới

Khi sinh viên vừa học xong một số môn, hệ thống sẽ lấy:

- GPA hiện tại
- điểm các môn đã có
- các hệ số đã huấn luyện trước đó

rồi đưa vào công thức kiểu:

```text
Điểm dự báo = intercept
            + hệ số_GPA × GPA
            + hệ số_môn_1 × điểm_môn_1
            + hệ số_môn_2 × điểm_môn_2
            + ...
```

Ví dụ minh họa:

```text
Điểm dự báo môn X
= 1.2
+ 0.4 × GPA
+ 0.3 × điểm môn A
+ 0.2 × điểm môn B
+ 0.1 × điểm môn C
```

Nếu một môn đầu vào chưa có điểm, hệ thống có thể thay bằng **điểm trung bình lớp** của môn đó để tránh bị thiếu dữ liệu.

### 2.4. Vì sao cách này không phải là KNN?

KNN hoạt động theo tư tưởng:

- tìm **K sinh viên gần giống nhất**
- xem họ đã học môn mục tiêu như thế nào
- lấy kết quả của nhóm gần nhất để suy ra kết quả cho sinh viên hiện tại

Trong khi đó, hệ thống hiện tại **không đi tìm hàng xóm gần nhất**.

Thay vào đó, hệ thống:

- học ra **hệ số ảnh hưởng** của GPA và các môn liên quan
- dùng **công thức hồi quy** để tính điểm dự báo

Vì vậy, đây là **mô hình hồi quy Ridge**, không phải KNN.

### 2.5. Vì sao hiện tại chưa chọn KNN?

Có thể giải thích ngắn gọn trong tài liệu như sau:

1. **Dữ liệu hiện tại chưa lớn**
   - dữ liệu đang dựa trên điểm của một lớp hoặc một số lớp giới hạn
   - với dữ liệu nhỏ, KNN dễ bị nhiễu và phụ thuộc mạnh vào vài mẫu gần nhất

2. **Cần tính giải thích cao**
   - hồi quy cho biết rõ môn nào ảnh hưởng nhiều, hệ số bao nhiêu
   - điều này dễ viết vào luận văn hơn và dễ giải thích với giảng viên

3. **Chi phí suy luận thấp và ổn định**
   - mô hình hồi quy chỉ cần lấy hệ số rồi tính toán
   - KNN phải tìm các điểm gần nhất mỗi lần dự báo

4. **Dễ kết hợp với phần đánh giá học tập**
   - hệ thống hiện tại cần một đầu ra định lượng gọn để đưa sang tầng MiniMax
   - hồi quy cho đầu ra rõ ràng hơn: điểm dự báo, độ tin cậy, so sánh với trung bình lớp

5. **Phù hợp giai đoạn hiện tại của đề tài**
   - mục tiêu chính không phải chứng minh thuật toán KNN
   - mà là xây dựng hệ thống AI hỗ trợ đánh giá kết quả học tập
   - vì vậy, mô hình hồi quy + AI nhận xét là đủ hợp lý cho phiên bản hiện tại

### 2.6. KNN đang ở trạng thái nào?

KNN có thể được xem là **hướng mở rộng trong tương lai**, ví dụ:

- tìm các sinh viên có hồ sơ học tập gần giống nhau
- tham khảo kết quả học tập của nhóm sinh viên tương đồng
- dùng như một mô hình phụ để so sánh với mô hình hồi quy hiện tại

Tuy nhiên, ở thời điểm hiện tại:

- trong code chưa có thuật toán KNN
- chưa có pipeline huấn luyện hoặc suy luận KNN
- chưa có đầu ra nào đang lấy trực tiếp từ KNN

Vì vậy, nếu viết vào báo cáo hoặc luận văn, nên ghi rõ:

> Hệ thống hiện tại chưa triển khai KNN trong phiên bản chính thức; phần dự báo điểm đang sử dụng mô hình hồi quy với trọng số đã huấn luyện sẵn, kết hợp với AI MiniMax để sinh nhận xét đánh giá học tập.

### 2.7. Cách viết dễ hiểu trong luận văn

Nếu muốn viết ngắn gọn, dễ hiểu, có thể dùng đoạn sau:

> Trong hệ thống, phần dự báo điểm không sử dụng KNN mà sử dụng mô hình hồi quy Ridge được huấn luyện trước từ dữ liệu điểm lịch sử. Đối với mỗi môn học cần dự báo, hệ thống xây dựng một mô hình riêng dựa trên GPA và các môn có tương quan cao với môn mục tiêu. Sau khi huấn luyện, các hệ số của mô hình được lưu lại để sử dụng khi dự báo cho sinh viên mới. Cách tiếp cận này giúp hệ thống dễ giải thích, chi phí tính toán thấp và phù hợp với quy mô dữ liệu hiện tại. Trên cơ sở kết quả định lượng này, AI MiniMax tiếp tục sinh ra nhận xét nhằm hỗ trợ đánh giá kết quả học tập của sinh viên.

## 3. Nguyên tắc thiết kế của luồng AI

Hệ thống được chia thành hai tầng:

### 3.1. Tầng dữ liệu và thống kê nội bộ

Tầng này chịu trách nhiệm:

- chấm bài
- xác định câu đúng, câu sai
- tổng hợp kết quả theo chương
- thống kê theo độ khó
- rút gọn dữ liệu trước khi gửi AI

### 3.2. Tầng AI MiniMax

Tầng này chịu trách nhiệm:

- nhận payload đã được nén
- sinh nhận xét học tập
- chỉ ra điểm mạnh, điểm yếu
- đưa ra gợi ý cải thiện

### 3.3. Ý nghĩa của cách chia tầng

Cách tiếp cận này giúp:

- không phải gửi toàn bộ 100 câu sai lên AI
- giảm chi phí token
- giảm độ rối của prompt
- giữ AI tập trung vào việc **đánh giá kết quả học tập**, thay vì chỉ lặp lại dữ liệu thô

## 4. Điều kiện đầu vào bắt buộc

### 4.1. CHƯƠNG là bắt buộc

Mỗi file Word import vào hệ thống phải có block khai báo chương ở đầu file, ví dụ:

```text
CHUONG 1 : Biến
CHUONG 2 : Vòng lặp
CHUONG 3 : Hàm
```

Mỗi câu hỏi phải có metadata chương, ví dụ:

```text
[LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]
Biến nào sau đây hợp lệ trong Python?
A. my_var
B. 1variable
C. my-var
D. class
[DAPAN:A]
```

### 4.2. Quy tắc kiểm tra hợp lệ

- Nếu file Word **không có block CHƯƠNG** ở đầu file:
  - file không hợp lệ
  - không được import
  - không được gửi lên AI

- Nếu file đã khai báo danh sách chương nhưng một câu **thiếu `[CHUONG:x]`**:
  - câu đó chưa hợp lệ
  - giáo viên bắt buộc phải chọn lại chương bằng dropdown
  - dropdown chỉ hiển thị các chương đã khai báo trong file Word

- Nếu câu dùng `[CHUONG:x]` nhưng `x` không nằm trong danh sách chương đã khai báo:
  - câu đó bị đánh dấu lỗi
  - giáo viên phải chọn lại một chương hợp lệ

## 5. Metadata phục vụ đánh giá học tập

Sau khi import hợp lệ, mỗi câu hỏi có thể mang các trường sau:

- `difficulty`: `DE | TRUNGBINH | KHO`
- `chapter`: số chương
- `chapter_label`: tên chương
- `answer_hint`: gợi ý chấm hoặc đáp án mẫu

Các trường này giúp hệ thống xác định:

- sinh viên sai nhiều ở chương nào
- sai nhiều câu dễ hay câu khó
- phần kiến thức nào cần ưu tiên ôn trước

## 6. Luồng hoạt động tổng thể

### Bước 1. Giáo viên tạo hoặc import đề

- import file Word
- hệ thống parse metadata của từng câu
- kiểm tra tính hợp lệ của `CHƯƠNG`
- nếu thiếu hoặc sai chương thì không cho xác nhận
- giáo viên bổ sung lại chương bằng dropdown nếu cần

### Bước 2. Sinh viên làm bài

- sinh viên nộp bài
- hệ thống chấm tự động các câu trắc nghiệm
- lưu `graded_details`

### Bước 3. Tổng hợp kết quả nội bộ

Hệ thống sinh ra `learning_assessment_summary`, gồm:

- `total_questions`
- `wrong_count`
- `wrong_rate`
- `mode`
- `chapter_summary`
- `representative_wrong_items`

Trong đó:

- `chapter_summary`: tổng hợp số câu sai theo từng chương
- `representative_wrong_items`: một số câu sai đại diện để AI hiểu bản chất lỗi

### Bước 4. Chọn mức dữ liệu gửi AI

Hệ thống không gửi toàn bộ các câu sai lên AI.
Thay vào đó, hệ thống chọn một trong bốn chế độ:

- `full_wrong_details`
- `chapter_samples`
- `summary_only`
- `all_wrong_summary`

### Bước 5. MiniMax sinh nhận xét học tập

AI nhận payload đã nén và sinh ra:

- nhận xét tổng quan
- điểm mạnh, điểm yếu
- mô tả vị trí tương đối
- lời khuyên ôn tập

### Bước 6. Frontend hiển thị kết quả

Thứ tự ưu tiên hiển thị:

1. **Đánh giá học tập theo chương**
2. **Nhận xét AI**
3. **Dự báo điểm (tham khảo)**

Như vậy, điểm dự báo không còn là trung tâm duy nhất của hệ thống.

## 7. Logic nén payload trước khi gửi AI

### 7.1. Các biến sử dụng

- `wrong_count`: tổng số câu sai
- `total_questions`: tổng số câu
- `wrong_rate = wrong_count / total_questions`

### 7.2. Ngưỡng cụ thể

#### Trường hợp 1: Sai ít

Điều kiện:

```text
wrong_rate < 0.3
```

Chế độ:

```text
mode = full_wrong_details
```

Cách xử lý:

- gửi đầy đủ danh sách câu sai
- gửi chi tiết hơn về từng câu sai

Ý nghĩa:

- AI có đủ dữ liệu để nhận xét cụ thể
- chi phí token vẫn ở mức chấp nhận được

#### Trường hợp 2: Sai ở mức trung bình

Điều kiện:

```text
0.3 <= wrong_rate < 0.7
```

Chế độ:

```text
mode = chapter_samples
```

Cách xử lý:

- lấy các chương sai nhiều nhất
- mỗi chương chỉ lấy một số câu sai đại diện
- ưu tiên những câu có giá trị phân loại cao hơn

Ý nghĩa:

- AI vẫn nhìn thấy bản chất lỗi
- nhưng không cần đọc toàn bộ câu sai

#### Trường hợp 3: Sai rất nhiều

Điều kiện:

```text
wrong_rate >= 0.7
```

Chế độ:

```text
mode = summary_only
```

Cách xử lý:

- chủ yếu gửi tổng hợp theo chương
- chỉ gửi rất ít câu sai đại diện
- nhấn mạnh các chương yếu nhất và lỗi có tính hệ thống

Ý nghĩa:

- tránh gửi quá nhiều dữ liệu thô
- tập trung vào câu hỏi “sinh viên yếu ở đâu?”

#### Trường hợp 4: Sai toàn bộ

Điều kiện:

```text
wrong_count == total_questions
```

Chế độ:

```text
mode = all_wrong_summary
```

Cách xử lý:

- chỉ gửi tổng quan mức độ không đạt
- nhấn mạnh các chương sai nhiều nhất
- gửi một vài câu rất đại diện

Ý nghĩa:

- đây là trường hợp cảnh báo học tập mạnh
- AI cần ưu tiên đánh giá phần kiến thức nền tảng

## 8. Cấu trúc dữ liệu tổng hợp

### 8.1. `chapter_summary`

Ví dụ:

```json
{
  "chapter": 2,
  "chapter_label": "Vòng lặp",
  "total": 10,
  "wrong": 6,
  "wrong_rate": 0.6,
  "easy_wrong": 2,
  "medium_wrong": 3,
  "hard_wrong": 1
}
```

Ý nghĩa:

- biết sinh viên yếu ở chương nào
- biết lỗi tập trung ở câu dễ hay câu khó
- giúp AI đưa ra lời khuyên sát hơn

### 8.2. `representative_wrong_items`

Ví dụ:

```json
{
  "q": 12,
  "stem": "Cho đoạn mã lệnh for ... kết quả là gì?",
  "chapter": 2,
  "chapter_label": "Vòng lặp",
  "difficulty": "TRUNGBINH",
  "explanation_short": "Cần phân biệt biến đếm và điều kiện lặp."
}
```

Ý nghĩa:

- AI nhìn thấy ví dụ cụ thể
- nhưng không phải đọc toàn bộ 100 câu sai

## 9. Đầu ra AI mong muốn

MiniMax cần được định hướng để tạo ra **nhận xét đánh giá học tập**, không chỉ là dự đoán điểm.

Đầu ra mong muốn gồm:

- `remark`: nhận xét tổng quan
- `weaknesses`: danh sách điểm yếu
- `advice`: danh sách lời khuyên
- `comparison`: mô tả vị trí tương đối
- `quantitative`:
  - `predicted_score`
  - `class_avg`
  - `percentile`
  - `predicted_grade`

Ví dụ định hướng:

- “Sinh viên đang yếu ở chương Vòng lặp và Hàm.”
- “Tỷ lệ sai cao ở các câu dễ của chương Biến cho thấy kiến thức nền tảng chưa vững.”
- “Nên ôn lại cấu trúc for/while, phạm vi biến và hàm trả về giá trị.”

## 10. Vì sao luồng này phù hợp với đề tài

Luồng mới phù hợp với đề tài hơn vì:

1. **Đánh giá theo kết quả bài làm thực tế**
   - dựa trên bài thi vừa nộp
   - dựa trên chương kiến thức đã học

2. **Chỉ ra mức độ đạt hoặc chưa đạt theo nhóm kiến thức**
   - không chỉ nói “dự đoán được 7.5”
   - mà còn chỉ ra “yếu ở chương nào”

3. **Có định hướng cải thiện học tập**
   - đưa ra gợi ý ôn tập cụ thể
   - có thứ tự ưu tiên rõ ràng

4. **Dự báo điểm chỉ là thành phần phụ**
   - vẫn có giá trị tham khảo
   - nhưng không chiếm vai trò trung tâm

## 11. Cách mô tả ngắn gọn để đưa vào luận văn

Có thể dùng đoạn sau:

> Trong phiên bản hiện tại, hệ thống áp dụng mô hình dự báo điểm dựa trên hồi quy và thống kê học tập, kết hợp với AI MiniMax để sinh nhận xét đánh giá kết quả học tập của sinh viên. Dữ liệu bài làm được tổng hợp theo chương, mức độ khó và các câu sai đại diện trước khi gửi tới AI, nhằm giảm chi phí xử lý và tăng độ chính xác của nhận xét. Thuật toán KNN chưa được triển khai trong phiên bản chính thức, nhưng có thể được xem là hướng mở rộng trong tương lai để tìm các sinh viên có hồ sơ học tập tương đồng.

## 12. Kết luận

Luồng AI hiện tại của hệ thống được xây dựng theo hướng:

- **CHƯƠNG là bắt buộc**
- **tổng hợp nội bộ trước**
- **nén payload rồi mới gửi AI**
- **AI tập trung vào đánh giá học tập**
- **dự báo điểm chỉ là tham khảo**
- **chưa áp dụng KNN trong phiên bản hiện tại**

Với cách tiếp cận này, hệ thống không còn nghiêng về “chỉ dự đoán điểm”, mà đã tiến gần hơn tới mục tiêu:

**hỗ trợ đánh giá kết quả học tập của sinh viên một cách có cấu trúc, có giải thích và có định hướng cải thiện.**
# AI Learning Assessment Flow

## 1. Muc tieu

Tai lieu nay mo ta luong AI moi cua he thong theo dung huong de tai:

**"XAY DUNG HE THONG TRUC TUYEN TICH HOP AI HO TRO DANH GIA KET QUA HOC TAP CUA SINH VIEN"**

Muc tieu khong chi la du doan diem, ma la:

- danh gia muc do dat duoc cua sinh vien sau khi lam bai
- xac dinh chuong/kien thuc dang yeu
- dua ra nhan xet va loi khuyen hoc tap co dinh huong
- chi dung du bao diem nhu mot chi so tham khao bo sung

## 2. Nguyen tac thiet ke

Luon tach he thong thanh 2 tang:

1. **Tang du lieu va thong ke noi bo**
   - cham bai
   - tong hop cau dung/sai
   - thong ke theo chuong
   - xac dinh muc do loi theo tung nhom kien thuc

2. **Tang AI MiniMax**
   - nhan payload da duoc nen
   - sinh nhan xet hoc tap
   - giai thich diem manh/yeu
   - de xuat cach on tap

Y nghia:

- he thong **khong gui toan bo 100 cau sai** len AI
- AI chi nhan phan tong hop can thiet
- chi phi token giam
- output sat voi "danh gia ket qua hoc tap" hon

## 3. Dieu kien dau vao bat buoc

### 3.1. CHUONG la bat buoc

Moi file Word import vao he thong phai co block khai bao chuong o dau file, vi du:

```text
CHUONG 1 : Bien
CHUONG 2 : Vong lap
CHUONG 3 : Ham
```

Moi cau hoi phai co metadata chuong, vi du:

```text
[LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]
Bien nao sau day hop le trong Python?
A. my_var
B. 1variable
C. my-var
D. class
[DAPAN:A]
```

### 3.2. Rule validate

- Neu file Word **khong co block CHUONG** o dau file:
  - khong hop le
  - khong duoc import
  - khong duoc gui len AI

- Neu file da khai bao danh sach chuong nhung mot cau **thieu `[CHUONG:x]`**:
  - cau do chua hop le
  - giao vien bat buoc chon lai chuong bang dropdown
  - dropdown chi hien cac chuong da khai bao trong file Word

- Neu cau dung `[CHUONG:x]` nhung `x` khong nam trong danh sach chuong da khai bao:
  - cau do bi danh dau loi
  - giao vien phai chon lai mot chuong hop le

## 4. Metadata cua cau hoi

Moi cau hoi sau khi import hop le se co cac truong lien quan den danh gia hoc tap:

- `difficulty`: `DE | TRUNGBINH | KHO`
- `chapter`: so chuong
- `chapter_label`: ten chuong
- `answer_hint`: goi y cham / dap an mau

Day la nen tang de he thong tong hop duoc:

- sinh vien sai nhieu o chuong nao
- sai nhieu cau de hay cau kho
- nen uu tien on phan nao truoc

## 5. Luong tong the

### Buoc 1. Giao vien tao/import de

- import file Word
- he thong parse metadata tung cau
- validate `CHUONG`
- neu thieu chuong thi khong cho confirm
- giao vien bo sung chuong bang dropdown neu can

### Buoc 2. Sinh vien lam bai

- sinh vien nop bai
- he thong cham tu dong cac cau trac nghiem
- luu `graded_details`

### Buoc 3. Tong hop ket qua noi bo

He thong tao `learning_assessment_summary` gom:

- `total_questions`
- `wrong_count`
- `wrong_rate`
- `mode`
- `chapter_summary`
- `representative_wrong_items`

Trong do:

- `chapter_summary`: tong hop so cau sai theo tung chuong
- `representative_wrong_items`: cac cau sai dai dien de AI hieu ban chat loi

### Buoc 4. Chon muc payload gui AI

Khong gui nguyen tat ca cau sai.
He thong chon 1 trong 4 mode:

- `full_wrong_details`
- `chapter_samples`
- `summary_only`
- `all_wrong_summary`

### Buoc 5. MiniMax sinh nhan xet hoc tap

AI nhan payload da nen va tra ve:

- nhan xet tong quan
- diem manh / diem yeu
- so sanh tuong doi
- loi khuyen on tap

### Buoc 6. Frontend hien thi

Muc ket qua uu tien:

1. **Danh gia hoc tap theo chuong**
2. **Nhan xet AI**
3. **Du bao diem (tham khao)**

Nhu vay, du bao diem khong con la trung tam duy nhat nua.

## 6. Logic nen payload gui AI

### 6.1. Bien su dung

- `wrong_count`: tong so cau sai
- `total_questions`: tong so cau
- `wrong_rate = wrong_count / total_questions`

### 6.2. Nguong cu the

#### Truong hop 1: Sai it

Dieu kien:

```text
wrong_rate < 0.3
```

Che do:

```text
mode = full_wrong_details
```

Xu ly:

- gui day du danh sach cau sai
- gui chi tiet hon ve tung cau sai
- phu hop khi so cau sai con it

Y nghia:

- AI co the nhan xet cu the
- do chi phi token van chap nhan duoc

#### Truong hop 2: Sai trung binh / sai nhieu nhung chua qua muc rat cao

Dieu kien:

```text
0.3 <= wrong_rate < 0.7
```

Che do:

```text
mode = chapter_samples
```

Xu ly:

- chi lay top chuong sai nhieu nhat
- moi chuong lay vai cau sai dai dien
- uu tien cau co trong so cao hon

Y nghia:

- AI van nhin thay duoc ban chat loi
- nhung khong can doc tat ca cac cau sai

#### Truong hop 3: Sai rat nhieu

Dieu kien:

```text
wrong_rate >= 0.7
```

Che do:

```text
mode = summary_only
```

Xu ly:

- gui tong hop theo chuong
- gui rat it cau sai dai dien
- nhan manh chuong yeu nhat va cac loi co he thong

Y nghia:

- tranh gui qua nhieu du lieu tho
- tap trung vao "hoc yeu o dau" thay vi liet ke tung cau

#### Truong hop 4: Sai tat ca

Dieu kien:

```text
wrong_count == total_questions
```

Che do:

```text
mode = all_wrong_summary
```

Xu ly:

- chi gui tong quan muc do khong dat
- gui chuong sai nhieu nhat
- gui mot so cau rat dai dien

Y nghia:

- day la muc canh bao hoc tap manh
- AI se uu tien danh gia mat nen tang kien thuc

## 7. Cau truc du lieu tong hop

### 7.1. `chapter_summary`

Moi chuong co the duoc tong hop nhu sau:

```json
{
  "chapter": 2,
  "chapter_label": "Vong lap",
  "total": 10,
  "wrong": 6,
  "wrong_rate": 0.6,
  "easy_wrong": 2,
  "medium_wrong": 3,
  "hard_wrong": 1
}
```

Y nghia:

- biet sinh vien yeu chuong nao
- biet loi nam o cau de hay cau kho
- giup AI dua loi khuyen sat hon

### 7.2. `representative_wrong_items`

Vi du:

```json
{
  "q": 12,
  "stem": "Cho doan ma lenh for ... ket qua la gi?",
  "chapter": 2,
  "chapter_label": "Vong lap",
  "difficulty": "TRUNGBINH",
  "explanation_short": "Can phan biet bien dem va dieu kien lap."
}
```

Y nghia:

- AI thay duoc vi du cu the
- nhung khong can doc toan bo 100 cau sai

## 8. Dau ra AI mong muon

MiniMax can duoc dinh huong de tra ve phan danh gia hoc tap, khong chi la du doan diem.

Dau ra mong muon gom:

- `remark`: nhan xet tong quan
- `weaknesses`: danh sach diem yeu
- `advice`: danh sach loi khuyen
- `comparison`: mo ta vi tri tuong doi
- `quantitative`:
  - `predicted_score`
  - `class_avg`
  - `percentile`
  - `predicted_grade`

Vi du dinh huong:

- "Sinh vien dang yeu o chuong Vong lap va Ham"
- "Ty le sai cao o cac cau de cua chuong Bien cho thay kien thuc nen tang chua vung"
- "Nen on lai cau truc for/while, pham vi bien, ham tra ve gia tri"

## 9. Vi sao luong nay phu hop voi de tai

Luong moi phu hop de tai hon vi:

1. **Danh gia theo ket qua bai lam thuc te**
   - dua tren bai thi vua nop
   - dua tren chuong kien thuc da hoc

2. **Chi ra muc do dat/khong dat theo nhom kien thuc**
   - khong chi bao "du doan duoc 7.5"
   - ma con chi ra "yeu chuong nao"

3. **Co dinh huong cai thien hoc tap**
   - loi khuyen on tap cu the
   - thu tu uu tien ro rang

4. **Du bao diem chi la thanh phan phu**
   - van co gia tri tham khao
   - nhung khong chiem vai tro trung tam

## 10. Ket luan

Luong AI moi cua he thong duoc xay dung theo huong:

- **CHUONG bat buoc**
- **tong hop noi bo truoc**
- **nen payload roi moi gui AI**
- **AI tap trung vao danh gia hoc tap**
- **du bao diem chi la tham khao**

Voi cach tiep can nay, he thong khong con nghieng ve "chi du doan diem", ma da tien gan hon voi muc tieu:

**ho tro danh gia ket qua hoc tap cua sinh vien mot cach co cau truc, co giai thich, va co dinh huong cai thien.**
