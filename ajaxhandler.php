<?php
// shortcut functions
function array_ifexists($key,$arr,$def=NULL) {
  return (is_array($arr) && array_key_exists($key,$arr)) ? $arr[$key] : $def;
}

function erase_cart() {
  global $db;
  $q = "DELETE FROM cart_items;";
  $r = $db->query($q);
}

function get_cart_totals() {
  global $db;
  $q = "SELECT SUM(qty) AS num, SUM(price*qty) AS price FROM cart_items;";
  $ret = array('cart_count'=>0, 'cart_total'=>0);
  if ($r = $db->query($q)) {
    $rr = $r->fetch_assoc();
    $ret['cart_count'] = $rr['num'];
    $ret['cart_total'] = $rr['price'];
    $r->free();
  }
  return $ret;
}

function get_cart_contents() {
  global $db, $deliver_per_cart, $deliver_per_item, $tax_rate;
  $q = "SELECT id, code, name, price, priceunit, qty, descript, img FROM cart_items;";
  $tr=array('items'=>array(), 'item_count'=>0, 'subtotal'=>0,
            'delivery'=>$deliver_per_cart, 'tax'=>0, 'total'=>0);
  if ($r = $db->query($q)) {
    while ($rr = $r->fetch_assoc()) {
      $xferkeys = array('id'=>'id','code'=>'code','name'=>'name','price'=>'price',
                        'qty'=>'quantity','priceunit'=>'priceunit',
                        'descript'=>'description','img'=>'imgpath');
      $newitem = array();
      foreach($xferkeys as $k=>$v) {
        $newitem[$v] = $rr[$k];
      }
      $newitem['subtotal']=($rr['qty']*$rr['price']);
      $tr['subtotal']+=$newitem['subtotal'];
      $tr['item_count']+=($rr['qty']);
      $tr['items'][]=$newitem;
    }
  }
  if (!$tr['item_count']) { $tr['delivery']=0; }
  $tr['delivery'] += $deliver_per_item * $tr['item_count'];
  $tr['tax'] = $tr['subtotal'] * $tax_rate;
  $tr['total'] = $tr['subtotal'] + $tr['delivery'] + $tr['tax'];
  return $tr;
}

// some global variables
$delivery_per_item = 0;
$delivery_per_cart = 4.95;
$tax_rate = .1;

// set up the database
$db = new mysqli('localhost','delivery_user','delivery','delivery');
if (!$db) {
  die(json_encode(array('result'=>'ERROR', 'msg'=>'No Database Connection')));
}

// route the request
$method = array_ifexists('requestType',$_POST);
$result = array('requestType'=>$method);
//error_log("running method=$method");
switch($method) {
  /* unused */
  case 'account-login':
    $result['login_status']='login';
    $result['username']=array_ifexists('username',$_POST,'George');
    break;
  /* unused */
  case 'account-logout':
    $result['login_status']='logout';
    break;
  /* unused */
  case 'account-create':
    $result['login_status']='login';
    $result['username']=array_ifexists('username',$_POST,'George');
    break;
  /* add a new item to the cart */
  case 'cart-update':
    $itemdata = array_ifexists('itemdata',$_POST,array());
    $code = $db->real_escape_string(array_ifexists('prodcode',$itemdata));
    $tid = (int)$db->real_escape_string(array_ifexists('id',$itemdata));
    $qty = (int)$db->real_escape_string(array_ifexists('quantity',$itemdata));
    $src = $db->real_escape_string(array_ifexists('source',$itemdata));
    if (!$tid) {
      $q = "SELECT id FROM cart_items WHERE code='$code' AND source='$src';";
      if ($r = $db->query($q)) {
        $rr=$r->fetch_assoc();
        $tid = (int)$db->real_escape_string($rr['id']);
      }
    }
    $q = '';
    if ($tid) {
      $q = $qty
           ? "UPDATE cart_items SET qty=$qty,source='$src' WHERE id=$tid;"
           : "DELETE FROM cart_items WHERE id=$tid;";
    } else {
      if ($code && $qty) {
        $q = "INSERT INTO cart_items (code,name,descript,price,qty,img,priceunit,source) " .
             "SELECT '$code','Ottomanelli Certified Black Angus','Filet Mignon Steak, Thick Cut, approx 8 oz, 1 steak', " .
             "'18.59',$qty,'sample-product.png','ea','$src';";
      }
    }
    if ($q) {
      $r = $db->query($q);
      $result['rows']=$db->affected_rows;
      $result['query']=$q;
    } else {
      $result['rows']=0;
      $result['query']='no query';
    }
    break;
  /* for clearing the cart */
  case 'cart-clear':
    erase_cart();
    //error_log('cleared');
    break;
  /* for all cart items & totals, and product suggestions */
  case 'cart-content':
    $result['cart'] = get_cart_contents();
    break;
  case 'cart-delete-item':
    $cartid = $db->real_escape_string((int)array_ifexists('cartID',$_POST));
    if ($cartid) {
      $q = "DELETE FROM cart_items WHERE id=$cartid";
      $r = $db->query($q);
      $result['cartid'] = $cartid;
    } else {
      $result['result']='ERROR';
      $result['msg']='Bad ID passed';
    }
    break;
  /* for reorder products */
  case 'cart-reorder':
    $arr = array('id'=>1,'code'=>'prod1','name'=>'Ottomanelli Certified Black Angus',
                 'price'=>18.59,'quantity'=>0,'priceunit'=>'ea','imgpath'=>'sample-product.png',
                 'description'=>'Filet Mignon Steak, Thick Cut, approx 8 oz, 1 steak'
                 );
    $result['cart'] = array('items'=>array());
    for ($x=0;$x<10;$x++) { array_push($result['cart']['items'],$arr); }
    break;
  /* for cart number of items and total price */
  case 'cart-totals':
    $result['cart_count']=0;
    $result['cart_total']=0;
    $result = array_merge($result, get_cart_totals());
    break;
  /* for saving the state of the cart flyout */
  case 'flyout-state':
    $result['state'] = (bool)array_ifexists('flyout_state',$_POST,false);
    break;
  /* for updating the steps on the order status page */
  case 'orderstatus':
    $on = (int)array_ifexists('orderNum',$_POST,0);
    $cs = (int)array_ifexists('currentStep',$_POST,0);
    if (!$on) { $cs=0; }
    if ($cs < 0 || $cs > 4) { $cs=0; }
    $result['step']=$cs;
    break;
  /* auto-suggest word list based on $_POST['fragment'] */
  case 'wordlist':
    $w = $db->real_escape_string(array_ifexists('fragment',$_POST,''));
    $result['words'] = array();
    if ($w) {
      $q = "SELECT word,1 as weight FROM wordlist WHERE word LIKE '{$w}%' " .
           "UNION SELECT word,2 FROM wordlist WHERE word LIKE '%{$w}%' AND word NOT LIKE '{$w}%' " .
           "ORDER BY weight,word;";
      if ($r = $db->query($q)) {
        while ($rr = $r->fetch_assoc()) {
          $result['words'][]=$rr['word'];
        }
        $r->free();
      }
    }
    break;
  default:
    $result['result']='ERROR';
    $result['msg']='Bad request type';
    break;
}
if (!array_ifexists('result',$result)) { $result['result']='OK'; }
echo json_encode($result);
