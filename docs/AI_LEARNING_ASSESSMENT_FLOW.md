# Luồng Điểm Dự Báo Và AI Đánh Giá Học Tập

## 1. Mục tiêu của tài liệu

Tài liệu này mô tả đúng logic đang chạy trong hệ thống sau các thay đổi mới nhất, tập trung vào câu hỏi quan trọng:

**"Phần điểm dự báo đang được tạo ra như thế nào, và nó tham gia vào AI đánh giá học tập ở mức nào?"**

Điểm cần chốt ngay từ đầu:

- hệ thống có **2 lớp xử lý khác nhau**
- **điểm dự báo** là phần **định lượng tham khảo**
- **AI đánh giá học tập** là phần **diễn giải và định hướng cải thiện**
- metadata `chapter` của câu hỏi **không dùng để tính điểm dự báo môn**
- metadata `chapter` **dùng trực tiếp cho AI đánh giá học tập**

Nói ngắn gọn:

> Hệ thống không lấy `chapter` để tính ra điểm dự báo môn học.  
> Hệ thống dùng `chapter` để xác định sinh viên đang yếu ở phần kiến thức nào, rồi mới cho AI sinh nhận xét đúng trọng tâm.

## 2. Kiến trúc tổng thể

Luồng hiện tại nên hiểu theo 3 tầng:

1. **Tầng dự báo điểm bằng mô hình toán học**
   - chạy trong backend
   - dùng dữ liệu điểm lịch sử
   - không gọi LLM để tính điểm
   - đầu ra là `predicted_score`, `predicted_grade`, `confidence`, `percentile`, `class_avg`

2. **Tầng phân tích bài làm gần nhất**
   - đọc các câu đúng/sai của sinh viên
   - nhóm lỗi theo `chapter`
   - rút ra các chương yếu, câu sai đại diện, hướng ôn tập

3. **Tầng AI nhận xét**
   - nhận dữ liệu đã được backend rút gọn và làm sạch
   - không tự suy đoán từ đầu
   - dùng kết quả định lượng + các chương yếu để sinh `remark`, `weaknesses`, `advice`

Vì vậy, nếu nói đúng bản chất hệ thống:

- **điểm dự báo** trả lời câu hỏi: "nếu học tiếp môn này thì khả năng điểm nằm khoảng nào?"
- **AI đánh giá** trả lời câu hỏi: "vì sao nên thận trọng/lạc quan, sinh viên đang yếu ở đâu, cần ôn gì trước?"

## 3. Các nguồn dữ liệu gốc

### 3.1. Nguồn dữ liệu cho dự báo điểm

Phần dự báo điểm đang bám vào 3 nguồn chính:

1. `subject_groups.json`
   - là nguồn chuẩn cho **nhóm môn thủ công**
   - xác định các môn nào được phép liên hệ với nhau khi train
   - hỗ trợ các nhóm `ordered`, `choose_one_path`, hoặc nhóm đặc thù do nghiệp vụ quy định

2. Subject catalog trong backend
   - là nguồn chuẩn cho `semester`
   - là nguồn chuẩn cho `prerequisites`
   - dùng để biết môn nào học trước, môn nào là tiên quyết

3. Dữ liệu điểm lịch sử
   - dùng để huấn luyện hệ số dự báo
   - mỗi dòng dữ liệu biểu diễn hồ sơ điểm của một sinh viên trên các môn đã học

### 3.2. Nguồn dữ liệu cho AI đánh giá học tập

Phần AI đánh giá học tập dùng dữ liệu khác với phần dự báo:

1. Kết quả bài thi gần nhất của sinh viên
2. Danh sách câu sai
3. Metadata của từng câu hỏi:
   - `chapter`
   - `chapter_label`
   - `difficulty`
   - `answer_hint` hoặc mô tả ngắn liên quan
4. Điểm dự báo môn mục tiêu
5. Một số chỉ số lớp để đặt bối cảnh tham khảo

Điểm quan trọng:

> `chapter` đi vào tầng đánh giá học tập, không đi vào công thức hồi quy dự báo môn.

## 4. Phần điểm dự báo đang làm gì

## 4.1. Bản chất mô hình

Hệ thống đang dùng mô hình hồi quy Ridge đã train sẵn cho từng môn mục tiêu.

Mỗi môn có thể có một mô hình riêng trong file:

- `BackEnd/server/src/data/model_weights.json`

Mỗi mô hình lưu các thành phần chính:

- `target_subject_id`
- `feature_ids`
- `intercept`
- `coeffs`
- `r2`
- `sample_count`
- `class_avg`
- `uses_gpa`

Sau thay đổi mới nhất:

- `uses_gpa` đang là `false`
- GPA **đã bị loại khỏi công thức chính**
- mô hình chỉ dùng **điểm các môn hợp lệ** làm feature

Điều này rất quan trọng về mặt nghiệp vụ, vì nó giúp giải thích mô hình dễ hơn:

- dự báo môn A phải dựa trên các môn liên quan hợp lệ
- không lấy một chỉ số tổng quát như GPA để "đẩy" kết quả lên xuống

### 4.2. Công thức dự báo hiện tại

Về bản chất, runtime đang tính:

```text
predicted_score
= intercept
+ coeff_1 x score(feature_1)
+ coeff_2 x score(feature_2)
+ ...
```

Trong đó:

- `feature_i` là một môn đã học và được phép dùng theo rule nghiệp vụ
- `score(feature_i)` là điểm thật của sinh viên ở môn đó
- nếu mô hình của môn mục tiêu không tồn tại thì hệ thống **không dự báo**

Điểm thay đổi rất quan trọng:

- **không còn fallback kiểu "ĐTB hiện tại + độ lệch GPA"**
- nếu không có mô hình hợp lệ thì backend trả về trạng thái không đủ điều kiện dự báo

## 5. Rule chọn feature để train mô hình

Đây là phần quan trọng nhất để tránh việc mô hình dùng sai môn.

Trước đây, mô hình có thể vô tình chọn môn tương quan theo thống kê nhưng sai về nghiệp vụ. Hiện tại, pipeline đã siết lại theo đúng rule.

### 5.1. Rule gốc

Một môn chỉ được phép làm feature cho môn mục tiêu khi thỏa các điều kiện nghiệp vụ:

1. **Phải thuộc cùng nhóm môn thủ công** trong `subject_groups.json`
2. **Không được ở học kỳ sau** môn mục tiêu
3. **Ưu tiên môn tiên quyết**
4. Nếu nhóm có `ordered: true` thì **ưu tiên hoặc chỉ lấy các môn đứng trước**
5. Nếu nhóm có logic đường học như `choose_one_path` thì chỉ lấy **các predecessor hợp lệ trên đường đó**

### 5.2. Ý nghĩa thực tế

Ví dụ:

- nếu muốn dự báo `Giáo dục quốc phòng P2`
- mô hình được phép nhìn vào `Giáo dục quốc phòng P1`
- nhưng không được dùng một môn khác chỉ vì thống kê thấy "có vẻ tương quan"

Tương tự:

- nếu muốn dự báo một môn ở học kỳ 5
- không được lấy môn ở học kỳ 6 làm đầu vào

### 5.3. Nới điều kiện cho chuỗi ngắn

Để xử lý các nhóm ít môn như:

- `P1 -> P2`

hệ thống đã nới rule ở mức có kiểm soát:

- `MIN_ALLOWED_FEATURES` giảm xuống `1`
- với nhóm `ordered` hoặc nhóm theo đường học đặc thù, hệ thống cho phép train khi số mẫu đạt ngưỡng nới lỏng

Điều này cho phép những chuỗi ngắn vẫn có mô hình, thay vì bị loại hoàn toàn.

### 5.4. Ngưỡng mẫu

Hiện tại trainer dùng 2 mức chính:

- `MIN_SAMPLES = 10`
- `RELAXED_MIN_SAMPLES = 5`

Hiểu ngắn gọn:

- nhóm bình thường phải có đủ dữ liệu hơn
- nhóm ordered hoặc path-based có thể chấp nhận ngưỡng thấp hơn để không mất toàn bộ khả năng dự báo

### 5.5. Điều hệ thống cố tình không làm

Để bám sát nghiệp vụ, trainer hiện tại cố tình **không** làm các việc sau:

- không lấy GPA làm feature chính
- không lấy môn ngoài nhóm chỉ vì tương quan cao
- không dự báo nếu không có model hợp lệ
- không dùng fallback định tính để giả lập kết quả

## 6. Quy trình train mô hình

File chính:

- `BackEnd/server/scripts/train-grade-predictor.ts`

Luồng train nên hiểu như sau:

1. Đọc dữ liệu điểm lịch sử
2. Đọc `subject_groups.json`
3. Đọc subject catalog từ backend
4. Đồng bộ metadata `semester` và `prerequisites`
5. Với từng môn mục tiêu:
   - xác định danh sách feature hợp lệ theo rule nghiệp vụ
   - lọc dữ liệu còn đủ mẫu
   - train hồi quy Ridge
   - lưu hệ số vào `model_weights.json`
6. Bỏ qua các môn không đủ điều kiện

Sau bước này, hệ thống chỉ giữ lại:

- những môn có mô hình đủ hợp lệ để dùng lúc runtime

## 7. Quy trình dự báo điểm ở runtime

Các file chính:

- `BackEnd/server/src/services/gradePredictor.service.ts`
- `BackEnd/server/src/services/predictionPrerequisite.service.ts`
- `BackEnd/server/src/utils/subjectGroups.util.ts`

Luồng runtime hiện tại:

1. Sinh viên chọn môn muốn dự báo
2. Backend kiểm tra eligibility:
   - đã có đủ môn trước chưa
   - môn này có mô hình không
3. Nếu không có mô hình:
   - trả về không đủ điều kiện dự báo
   - vẫn có thể giữ phần đánh giá học tập nếu luồng bài thi tồn tại
4. Nếu có mô hình:
   - lấy điểm các môn feature của sinh viên
   - áp công thức hồi quy
   - clamp hoặc chuẩn hóa về thang điểm hợp lệ
   - suy ra `predicted_grade`, `confidence`, `percentile`, `class_avg`

Điểm cần nhớ:

> Phần dự báo điểm chạy bằng công thức toán học trên hệ số đã train, không để AI tự bịa ra điểm.

## 8. `chapter` có tham gia dự báo điểm không?

**Không.**

Đây là kết luận cần viết thật rõ trong tài liệu và luận văn.

### 8.1. `chapter` không tham gia ở đâu

`chapter` không đi vào:

- dữ liệu train hồi quy
- danh sách feature của mô hình
- công thức tính `predicted_score`
- điều kiện chọn feature cho môn mục tiêu

### 8.2. `chapter` tham gia ở đâu

`chapter` tham gia vào:

- phân tích bài thi gần nhất
- gom nhóm câu sai theo chương
- xác định `weak_chapters`
- tạo gợi ý ôn tập theo đúng phần kiến thức đang yếu
- cung cấp ngữ cảnh cho AI nhận xét

Nói cách khác:

- **điểm dự báo** trả lời câu hỏi "có thể đạt khoảng bao nhiêu"
- **chapter** trả lời câu hỏi "đang yếu ở phần nào nên phải ôn lại"

## 9. Vì sao `chapter` là bắt buộc cho AI đánh giá

Nếu không có `chapter`, hệ thống chỉ biết:

- sinh viên sai câu 4
- sinh viên sai câu 9
- sinh viên sai câu 19

Nhưng AI sẽ rất khó kết luận:

- sai này thuộc phần biến hay vòng lặp
- lỗi là do nền tảng yếu hay do câu quá khó
- nên ưu tiên ôn phần nào trước

Khi có `chapter`, backend mới rút được các insight như:

- sai tập trung ở `Chương 1 - Biến và kiểu dữ liệu`
- sai tiếp ở `Chương 2 - Cấu trúc điều kiện và vòng lặp`
- có lỗi ở `Chương 3 - Hàm`

Chính các insight này mới làm cho AI nhận xét "đúng nghĩa đánh giá học tập", thay vì chỉ nói chung chung rằng điểm thấp hay điểm khá.

## 10. Luồng backend tạo dữ liệu cho AI đánh giá

File chính:

- `BackEnd/server/src/services/prediction.service.ts`
- `BackEnd/server/src/services/aiEvaluator.service.ts`

Sau khi có điểm dự báo, backend còn làm thêm một nhánh khác để phục vụ AI.

### 10.1. Thu thập dữ liệu từ bài thi gần nhất

Backend lấy từ bài thi vừa làm hoặc kết quả gần nhất:

- danh sách câu sai
- nội dung câu
- `chapter`
- `chapter_label`
- mức độ khó

### 10.2. Gom lỗi theo chương

Backend tổng hợp để tạo các insight như:

- chương nào sai nhiều nhất
- câu sai nào là đại diện
- chương nào cần ưu tiên ôn trước

Các hàm xử lý chính hiện tại xoay quanh:

- chuẩn hóa nhãn chương
- xây `weak_chapters`
- chuyển `weak_chapters` thành các dòng `weaknesses`
- chuyển `weak_chapters` thành các dòng `advice`

### 10.3. Chống lặp nội dung

Một thay đổi quan trọng vừa được làm là:

- hệ thống có bước chuẩn hóa key nội dung
- loại bỏ các dòng nhận xét bị lặp ý

Mục tiêu là tránh tình trạng output kiểu:

- "Cần củng cố Chương 1"
- "Chương 1"
- "Chương 1 nên ôn lại"

xuất hiện chồng lên nhau quá nhiều.

## 11. AI thực sự nhận những gì

AI không được gửi toàn bộ dữ liệu thô một cách vô kiểm soát.

Backend sẽ chuẩn bị một payload đã được chọn lọc, thường gồm:

- môn mục tiêu
- điểm dự báo
- mức tự tin
- mức xếp loại dự báo
- một số chỉ số tham khảo của lớp
- danh sách `weak_chapters`
- danh sách câu sai đại diện
- summary đã rút gọn từ backend

Vì vậy, MiniMax trong hệ thống này có vai trò:

- **không tự tính điểm**
- **không tự quyết định feature môn học**
- **không tự suy ra chapter từ đầu**
- **chủ yếu diễn giải dữ liệu đã được backend chuẩn hóa**

## 12. AI được yêu cầu trả về gì

Theo luồng hiện tại, phần AI đánh giá trả về các nhóm nội dung chính:

- `remark`: nhận xét tổng quan
- `weaknesses`: các điểm cần cải thiện
- `advice`: các gợi ý ôn tập

Trước đây hệ thống từng có thêm phần so sánh với lớp hiển thị rõ ở UI, nhưng phần này đã được giảm vai trò trong giao diện để tránh làm người dùng tập trung quá nhiều vào đối chiếu thống kê.

Điều quan trọng nhất của output mới là:

- phải bám vào `weak_chapters`
- không nói chung chung kiểu "dữ liệu còn ít"
- không phô ra chi tiết kỹ thuật như `R²`, "cùng nhóm", hay chẩn đoán mang tính mô hình
- phải chuyển trọng tâm sang kiến thức mà sinh viên cần ôn

## 13. Mối quan hệ giữa điểm dự báo và AI đánh giá

Đây là phần dễ bị hiểu sai nhất, nên cần tách rất rõ.

### 13.1. Điểm dự báo dùng để làm gì

Điểm dự báo giúp tạo ra:

- một mốc định lượng
- một tín hiệu tham khảo về khả năng học môn tiếp theo
- một ngữ cảnh để AI viết nhận xét tổng quan

Ví dụ:

- nếu điểm dự báo ở mức khá, AI có thể viết nhận xét theo hướng "có nền tảng để theo học"
- nhưng nếu `weak_chapters` lại tập trung ở kiến thức nền, AI vẫn phải nhấn mạnh việc ôn lại

### 13.2. Điểm dự báo không được dùng để làm gì

Điểm dự báo không được phép trở thành:

- lý do duy nhất để kết luận sinh viên học tốt
- cơ sở duy nhất để sinh lời khuyên
- thứ thay thế cho dữ liệu bài thi thật

Đó là lý do hệ thống hiện tại ưu tiên:

1. bài làm gần nhất
2. chương đang yếu
3. câu sai đại diện
4. rồi mới dùng điểm dự báo như phần bối cảnh bổ sung

## 14. Ví dụ nghiệp vụ cụ thể

Giả sử sinh viên muốn dự báo môn `Lập trình mobile`.

Luồng thực tế:

1. Backend kiểm tra môn này có model hợp lệ không
2. Nếu có:
   - lấy điểm các môn tiền đề hợp lệ theo nhóm thủ công
   - tính ra `predicted_score`
3. Đồng thời hệ thống xem bài thi gần nhất:
   - sai câu về biến
   - sai câu về vòng lặp
   - sai câu về hàm
4. Backend nhóm thành:
   - `Chương 1 - Biến và kiểu dữ liệu`
   - `Chương 2 - Cấu trúc điều kiện và vòng lặp`
   - `Chương 3 - Hàm`
5. AI nhận:
   - điểm dự báo môn mobile
   - các chương yếu nói trên
   - một số câu sai đại diện
6. AI sinh ra nhận xét kiểu:
   - điểm dự báo ở mức khá nhưng kiến thức nền chưa chắc
   - cần ưu tiên ôn lại chương biến, vòng lặp, hàm trước khi học sâu hơn

Trong ví dụ này:

- **điểm dự báo** đến từ mô hình hồi quy
- **nội dung yếu ở Chương 1, 2, 3** đến từ bài thi và metadata `chapter`

Hai nhánh này gặp nhau ở bước cuối để tạo ra đánh giá hoàn chỉnh.

## 15. Trường hợp không có mô hình dự báo

Hệ thống hiện tại xử lý rất rõ:

- nếu môn mục tiêu không có model hợp lệ thì **không dự báo điểm**
- backend không dùng fallback giả lập
- frontend có thể ẩn hoặc chặn những môn không dự báo được

Nhưng nếu hệ thống vẫn có dữ liệu bài thi gần nhất, phần AI đánh giá học tập theo chương vẫn có ý nghĩa độc lập.

Điều này đúng với yêu cầu nghiệp vụ:

> Không có model thì phải từ chối phần dự báo, nhưng không được làm hỏng phần đánh giá học tập.

## 16. Ý nghĩa của thiết kế hiện tại đối với đề tài

Thiết kế hiện tại phù hợp với đề tài hơn cách chỉ chăm chăm dự đoán điểm, vì:

1. Có phần định lượng rõ ràng
   - dựa trên điểm lịch sử
   - có rule nghiệp vụ kiểm soát feature

2. Có phần đánh giá học tập thật sự
   - dựa trên bài thi vừa làm
   - xác định chương yếu cụ thể

3. Có khả năng giải thích
   - biết mô hình dự báo lấy thông tin từ đâu
   - biết AI nhận xét dựa vào chương nào

4. Hạn chế được các kết luận sai
   - không dùng môn vô lý để dự báo
   - không cho AI tự nói lan man về kỹ thuật mô hình

## 17. Cách viết ngắn gọn cho báo cáo/luận văn

Có thể dùng đoạn sau:

> Hệ thống được thiết kế theo hai lớp bổ trợ nhau. Lớp thứ nhất là mô hình dự báo điểm học phần, được huấn luyện ngoại tuyến bằng hồi quy Ridge trên dữ liệu điểm lịch sử, với tập feature bị ràng buộc chặt bởi nhóm môn thủ công, học kỳ và quan hệ tiên quyết. Lớp thứ hai là lớp đánh giá học tập bằng AI, sử dụng dữ liệu bài thi gần nhất đã được tổng hợp theo chương kiến thức, độ khó và các câu sai đại diện. Trong đó, metadata `chapter` không tham gia vào công thức dự báo điểm mà được dùng để xác định mảng kiến thức sinh viên còn yếu, từ đó giúp AI sinh ra nhận xét và gợi ý ôn tập đúng trọng tâm. Vì vậy, điểm dự báo đóng vai trò chỉ số tham khảo định lượng, còn phần đánh giá theo chương mới là trung tâm của chức năng hỗ trợ học tập.

## 18. Kết luận chốt nghiệp vụ

Kết luận cuối cùng cần giữ thống nhất trong toàn bộ tài liệu:

- **phần điểm dự báo là phần toán học, không phải phần AI tự suy ra**
- **GPA đã bị loại khỏi mô hình dự báo hiện tại**
- **feature dự báo chỉ được lấy từ các môn hợp lệ theo rule nghiệp vụ**
- **không có model thì không dự báo**
- **`chapter` không dùng để tính điểm dự báo**
- **`chapter` là đầu vào rất quan trọng cho AI đánh giá học tập**
- **AI dùng điểm dự báo như bối cảnh tham khảo, nhưng dùng chương yếu để đưa ra nhận xét và gợi ý cải thiện**

Nếu cần mô tả hệ thống bằng một câu ngắn, câu đúng nhất là:

> Hệ thống dùng mô hình hồi quy để ước lượng điểm học phần tiếp theo, sau đó dùng dữ liệu bài thi được gắn `chapter` để AI giải thích sinh viên đang yếu ở đâu và nên ôn phần nào trước.
