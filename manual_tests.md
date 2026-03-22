auth:
- login with google
- login with email

profile:
- change user name
- upload profile

cart:
- add to cart (can still add if not logged in)
- increment item amount in cart
- remove from cart
- clear all
- cart items persist on app close and logout
- discount applied in cart

checkout & transac with push notif:
- discount applied in checkout
- checkout success
- update order status to paid, received push notif, notif redirect to order detail
- update order status to shipped, received push notif, notif redirect to order detail
- update order status to completed, received push notif, (couldnt test completed notif redirect, android emu was lagging, had to restart)

orders:
- view list of orders
- view order details (items, amount/price, status)

search & filtering
- search product keyword
- search with autocomplete
- search with category
- sort by price ^ and v
- sort by top rated
- filter by category
- filter by min/max price

reviews:
- review only product with complete transaction
- leave review in order details screen
- prevented from leaving review with bad words
- leave review in in product detail screen
- update review in product detail screen
- update review in order detail screen
- user soft delete review, rating recalculated

wishlist:
- add prod to list
- add to cart from list
- remove from list

