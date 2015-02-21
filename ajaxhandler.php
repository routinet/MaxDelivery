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
error_log("running method=$method");
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
  case 'cart-add-product':
    $products = array_ifexists('products',$_POST);
    if (is_array($products)) {
      $pids = array();
      foreach ($products as $k=>$v) {
        $code = $db->real_escape_string(array_ifexists('code',$v));
        $source = $db->real_escape_string(array_ifexists('source',$v));
        $qty = (int)$db->real_escape_string(array_ifexists('qty',$v));
        $idx = "{$code}{$source}";
        if (!array_key_exists($idx,$pids)) {
          $pids[$idx] = array('code'=>$code,'source'=>$source,'newqty'=>$qty,'oldqty'=>0);
        } else {
          $pids[$idx]['newqty'] += $qty;
        }
      }
      $q = "SELECT id, code, source, qty FROM cart_items;";
      error_log("Search query: $q");
      if ($r = $db->query($q)) {
        while ($rr = $r->fetch_assoc()) {
          $idx = "{$rr['code']}{$rr['source']}";
          if (!array_key_exists($idx,$pids)) { $pids[$idx] = array(); }
          $pids[$idx] = array('id'=>(int)$rr['id'],
                              'code'=>$rr['code'],
                              'source'=>$rr['source'],
                              'newqty'=>array_ifexists('newqty',$pids[$idx],0),
                              'oldqty'=>(int)$rr['qty']);
        }
        $r->free();
      }
      error_log("All items:\n".print_r($pids,1));
      $values = array();
      foreach ($pids as $k=>$v) {
        $values[] = "('{$v['code']}','Ottomanelli Certified Black Angus','Filet Mignon Steak, " .
                    "Thick Cut, approx 8 oz, 1 steak',18.59," . ($v['oldqty']+$v['newqty']) .
                    ",'sample-product.png', 'ea','{$v['source']}')";
      }
      error_log("All values:\n".print_r($values,1));
      if ($values) {
        erase_cart();
        // the INSERT should actually draw from a product table for more info
        $q = "INSERT INTO cart_items (code,name,descript,price,qty,img,priceunit,source) " .
               "VALUES " . implode(',',$values) . ";";error_log('final query: '.$q);
        $r = $db->query($q);
      }
    }
    break;
  /* for clearing the cart */
  case 'cart-clear':
    erase_cart();
    error_log('cleared');
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
